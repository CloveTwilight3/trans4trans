import requests
import asyncio
from typing import List
from config import DISCORD_WEBHOOKS
import logging

logger = logging.getLogger(__name__)

async def send_discord_notification(letter_data: dict):
    """Send notification to all configured Discord webhooks"""
    if not DISCORD_WEBHOOKS or not DISCORD_WEBHOOKS[0]:  # Check if webhooks are configured
        logger.info("No Discord webhooks configured, skipping notification")
        return
    
    # Create the message
    from_name = letter_data.get("from", "Unknown")
    letter_id = letter_data.get("id", "")
    subject = letter_data.get("subject", "No Subject")
    url = f"https://trans4trans.win/letter.html?id={letter_id}"
    
    message = {
        "content": f"📝 **New letter written by {from_name}**\n**Subject:** {subject}\n{url}",
        "username": "Trans4Trans Letters",
        "avatar_url": "https://www.yuri-lover.win/pfp/trans4trans.gif"
    }
    
    # Send to all webhooks
    tasks = []
    for webhook_url in DISCORD_WEBHOOKS:
        webhook_url = webhook_url.strip()
        if webhook_url:
            tasks.append(send_to_webhook(webhook_url, message))
    
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Log results
        successful = sum(1 for result in results if result is True)
        failed = len(results) - successful
        
        if successful > 0:
            logger.info(f"Discord notification sent to {successful} webhook(s)")
        if failed > 0:
            logger.warning(f"Failed to send to {failed} webhook(s)")

async def send_to_webhook(webhook_url: str, message: dict) -> bool:
    """Send message to a single Discord webhook"""
    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: requests.post(webhook_url, json=message, timeout=10)
        )
        
        if response.status_code == 204:
            return True
        else:
            logger.error(f"Discord webhook failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending Discord notification: {str(e)}")
        return False