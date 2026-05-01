"""
Document Processor Module
Handles extraction of text from various document formats:
- PDF (text and images via OCR)
- Excel (.xlsx, .xls)
- CSV (.csv)
- Word (.docx)

Also supports Vision AI for graph/chart understanding in PDFs.
"""

import base64
import logging
import os
import shutil
import tempfile
from abc import ABC, abstractmethod
from io import BytesIO
from pathlib import Path
from typing import List, Optional, Tuple

import pandas as pd
import pdfplumber
import requests
from ai_assistant.http import call_groq, call_openrouter, call_ollama
from docx import Document
from pdf2image import convert_from_bytes
from PIL import Image
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Try to import pytesseract, but make it optional
try:
    import pytesseract
except ImportError:
    pytesseract = None
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract is not installed. OCR for PDF images will not be available.")
else:
    TESSERACT_AVAILABLE = shutil.which("tesseract") is not None
    if not TESSERACT_AVAILABLE:
        logger.warning(
            "Tesseract binary is not installed or not on PATH. OCR for PDF images will be disabled."
        )

# Vision AI prompt for analyzing graphs/charts
VISION_ANALYSIS_PROMPT = """Analyze this image which may contain a graph, chart, or data visualization. 
Provide a detailed description including:
1. Type of visualization (bar chart, line graph, pie chart, table, etc.)
2. Key data points and trends
3. Any text labels, titles, or legends
4. Summary of what the data shows

If the image is not a data visualization, describe what is shown."""


class DocumentResult(BaseModel):
    """Result of document processing"""
    text: str
    file_type: str
    pages: int = 1
    has_images: bool = False
    image_descriptions: List[str] = []


class BaseDocumentProcessor(ABC):
    """Abstract base class for document processors"""
    
    @abstractmethod
    def process(self, file_path: str) -> DocumentResult:
        """Process a document and extract text"""
        pass
    
    @abstractmethod
    def can_process(self, file_path: str) -> bool:
        """Check if this processor can handle the given file"""
        pass


class PDFProcessor(BaseDocumentProcessor):
    """Processor for PDF files with OCR support for images"""
    
    def __init__(self, use_ocr: bool = True, vision_api_key: Optional[str] = None):
        self.use_ocr = use_ocr and TESSERACT_AVAILABLE
        self.vision_api_key = vision_api_key
        self.vision_enabled = bool(
            self.vision_api_key
            or os.environ.get("GROQ_API_KEY")
            or os.environ.get("OPENROUTER_API_KEY")
            or os.environ.get("OLLAMA_URL")
        )
    
    def can_process(self, file_path: str) -> bool:
        return file_path.lower().endswith('.pdf')
    
    def process(self, file_path: str) -> DocumentResult:
        """Process PDF with text and image extraction"""
        texts = []
        image_descriptions = []
        has_images = False
        
        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            
            for page_num, page in enumerate(pdf.pages, 1):
                # Extract text
                page_text = page.extract_text() or ""
                if page_text.strip():
                    texts.append(f"--- Page {page_num} ---\n{page_text}")
                
                # Extract and process images
                page_images = page.images
                if page_images:
                    has_images = True
                    img_texts = self._process_page_images(page, page_num)
                    image_descriptions.extend(img_texts)
        
        full_text = "\n\n".join(texts)
        if image_descriptions:
            full_text += "\n\n--- Image Content ---\n" + "\n\n".join(image_descriptions)
        
        return DocumentResult(
            text=full_text,
            file_type="pdf",
            pages=total_pages,
            has_images=has_images,
            image_descriptions=image_descriptions
        )
    
    def _process_page_images(self, page, page_num: int) -> List[str]:
        """Extract text from images on a page using OCR and summarize graphs."""
        image_texts = []
        ocr_text = ""
        
        try:
            # Get page as image
            page_image = page.to_image(resolution=150)
            
            # Convert to bytes for OCR
            img_bytes = BytesIO()
            page_image.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            
            # Use pytesseract for OCR when the runtime binary is available.
            if self.use_ocr:
                img = Image.open(img_bytes)
                ocr_text = pytesseract.image_to_string(img).strip()
                if ocr_text:
                    image_texts.append(f"Page {page_num} Image Text: {ocr_text}")
            else:
                logger.debug(
                    f"Skipping OCR on page {page_num} because Tesseract is unavailable."
                )

            # Use a text-based AI backend to summarize graph-like images when available.
            if self.vision_enabled and ocr_text:
                graph_summary = self._summarize_image_content(ocr_text, page_num)
                if graph_summary:
                    image_texts.append(graph_summary)
        except Exception as e:
            logger.warning(f"Failed to process images on page {page_num}: {e}")
        
        return image_texts

    def _summarize_image_content(self, image_text: str, page_num: int) -> Optional[str]:
        """Use an AI backend to generate a graph/chart summary from image OCR text."""
        prompt = (
            VISION_ANALYSIS_PROMPT
            + "\n\nExtracted text from the image:\n"
            + image_text
            + "\n\nProvide a concise summary that can be indexed for search."
        )
        response = call_groq(prompt) or call_openrouter(prompt) or call_ollama(prompt)
        if not response:
            return None
        return f"Page {page_num} Image Summary: {response.strip()}"
    
    def process_from_url(self, file_url: str) -> DocumentResult:
        """Process PDF from a URL"""
        response = requests.get(file_url, timeout=30)
        response.raise_for_status()
        
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
            f.write(response.content)
            temp_path = f.name
        
        try:
            return self.process(temp_path)
        finally:
            os.unlink(temp_path)


# File extension constants
EXT_XLSX = ".xlsx"
EXT_XLS = ".xls"
EXT_CSV = ".csv"
EXT_DOCX = ".docx"
EXT_PDF = ".pdf"


class ExcelProcessor(BaseDocumentProcessor):
    """Processor for Excel files (.xlsx, .xls)"""
    
    def can_process(self, file_path: str) -> bool:
        lower = file_path.lower()
        return lower.endswith(EXT_XLSX) or lower.endswith(EXT_XLS)
    
    def process(self, file_path: str) -> DocumentResult:
        """Process Excel file and extract data as text"""
        texts = []
        
        # Read all sheets
        excel_file = pd.ExcelFile(file_path)
        
        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name)
            sheet_text = "--- Sheet: " + sheet_name + " ---\n"
            
            # Convert DataFrame to string representation
            sheet_text += df.to_string()
            texts.append(sheet_text)
        
        full_text = "\n\n".join(texts)
        
        return DocumentResult(
            text=full_text,
            file_type="excel",
            pages=len(excel_file.sheet_names)
        )


class CSVProcessor(BaseDocumentProcessor):
    """Processor for CSV files"""
    
    def can_process(self, file_path: str) -> bool:
        return file_path.lower().endswith('.csv')
    
    def process(self, file_path: str) -> DocumentResult:
        """Process CSV file and extract data as text"""
        df = pd.read_csv(file_path)
        
        text = "--- CSV Data ---\n"
        text += f"Columns: {', '.join(df.columns.tolist())}\n"
        text += f"Rows: {len(df)}\n\n"
        text += df.to_string()
        
        return DocumentResult(
            text=text,
            file_type="csv",
            pages=1
        )


class WordProcessor(BaseDocumentProcessor):
    """Processor for Word documents (.docx)"""
    
    def can_process(self, file_path: str) -> bool:
        return file_path.lower().endswith(EXT_DOCX)
    
    def process(self, file_path: str) -> DocumentResult:
        """Process Word document and extract text"""
        doc = Document(file_path)
        texts = []
        
        # Extract text from paragraphs
        for para in doc.paragraphs:
            if para.text.strip():
                texts.append(para.text.strip())
        
        # Extract text from tables
        for table in doc.tables:
            table_text = "--- Table ---\n"
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells]
                table_text += " | ".join(row_text) + "\n"
            texts.append(table_text)
        
        full_text = "\n\n".join(texts)
        
        return DocumentResult(
            text=full_text,
            file_type="word",
            pages=len(doc.paragraphs)
        )


class DocumentProcessorFactory:
    """Factory for creating document processors"""
    
    def __init__(self, use_ocr: bool = True, vision_api_key: Optional[str] = None):
        self.processors = [
            PDFProcessor(use_ocr=use_ocr, vision_api_key=vision_api_key),
            ExcelProcessor(),
            CSVProcessor(),
            WordProcessor(),
        ]
    
    def get_processor(self, file_path: str) -> Optional[BaseDocumentProcessor]:
        """Get the appropriate processor for a file"""
        for processor in self.processors:
            if processor.can_process(file_path):
                return processor
        return None
    
    def process(self, file_path: str) -> DocumentResult:
        """Process a document file"""
        processor = self.get_processor(file_path)
        if processor is None:
            raise ValueError(f"Unsupported file type: {file_path}")
        return processor.process(file_path)
    
    def process_from_url(self, file_url: str, file_type: Optional[str] = None) -> DocumentResult:
        """Process a document from a URL"""
        # Determine file type from URL or extension
        if file_type is None:
            # Try to infer from URL
            url_lower = file_url.lower()
            if EXT_PDF in url_lower:
                file_type = 'pdf'
            elif EXT_XLSX in url_lower or EXT_XLS in url_lower:
                file_type = 'excel'
            elif EXT_CSV in url_lower:
                file_type = 'csv'
            elif EXT_DOCX in url_lower:
                file_type = 'word'
            else:
                raise ValueError("Cannot determine file type from URL: " + file_url)
        
        # Download file
        response = requests.get(file_url, timeout=30)
        response.raise_for_status()
        
        # Get extension
        ext_map = {
            'pdf': '.pdf',
            'excel': '.xlsx',
            'csv': '.csv',
            'word': '.docx',
        }
        ext = ext_map.get(file_type, '.tmp')
        
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as f:
            f.write(response.content)
            temp_path = f.name
        
        try:
            return self.process(temp_path)
        finally:
            os.unlink(temp_path)


# Singleton instance
_default_factory: Optional[DocumentProcessorFactory] = None


def get_document_processor(use_ocr: bool = True, vision_api_key: Optional[str] = None) -> DocumentProcessorFactory:
    """Get the default document processor factory"""
    global _default_factory
    if _default_factory is None:
        _default_factory = DocumentProcessorFactory(use_ocr=use_ocr, vision_api_key=vision_api_key)
    return _default_factory


def process_document(file_path: str) -> DocumentResult:
    """Convenience function to process a document"""
    return get_document_processor().process(file_path)


def process_document_from_url(file_url: str) -> DocumentResult:
    """Convenience function to process a document from a URL"""
    return get_document_processor().process_from_url(file_url)