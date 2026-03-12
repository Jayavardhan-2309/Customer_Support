import { NextRequest, NextResponse } from "next/server";

import api from "@/src/lib/axios";

export async function GET(req: NextRequest) {
    try{
        const {data}= await api.get('/chat/history/', {
            headers:{
                cookie: req.headers.get("cookie") || "", // forwards cookie to django
            },
        });
        return NextResponse.json(data);
    }
    catch(err: any){
        console.log("chat history error: "+err);
        return NextResponse.json({
            detail: "failed to get chat history",
        }, {status: 500});
    }
}