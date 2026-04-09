import json
from channels.generic.websocket import AsyncWebsocketConsumer


class TicketConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        # Join group
        await self.channel_layer.group_add(
            "tickets",
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave group
        await self.channel_layer.group_discard(
            "tickets",
            self.channel_name
        )

    # This is called when backend sends event
    async def send_ticket(self, event):
        # Send message to frontend
        await self.send(text_data=json.dumps(event["data"]))