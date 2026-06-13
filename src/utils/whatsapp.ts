/**
 * Helper utility to non-blockingly send WhatsApp messages via Evolution API.
 * Uses hardcoded baseurl and global api key as requested.
 */

const EVO_BASE_URL = 'https://evo.nganjuk.net';
const EVO_GLOBAL_KEY = 'nganjuk123';

export async function sendWhatsappMessage(number: string, text: string): Promise<boolean> {
  const instanceName = localStorage.getItem('evo_instance_name') || 'hidis';
  
  if (!number) {
    console.warn('Skipping WA dispatch: No destination number specified.');
    return false;
  }
  
  // Normalize Indonesian number format (just in case)
  let formattedNumber = number.trim().replace(/[^0-9]/g, '');
  if (formattedNumber.startsWith('0')) {
    formattedNumber = '62' + formattedNumber.slice(1);
  } else if (formattedNumber.startsWith('8')) {
    formattedNumber = '62' + formattedNumber;
  }

  try {
    const response = await fetch(`${EVO_BASE_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_GLOBAL_KEY
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: text
      })
    });

    if (response.ok) {
      console.log(`WhatsApp message successfully sent to ${formattedNumber}`);
      return true;
    } else {
      const errText = await response.text();
      console.error(`Evolution API returned error:`, errText);
      return false;
    }
  } catch (err) {
    console.error('Failed to dispatch WhatsApp message via Evolution API:', err);
    return false;
  }
}

/**
 * Sends a notification directly to the configured WhatsApp Admin
 */
export async function sendAdminNotification(text: string): Promise<boolean> {
  const adminNum = localStorage.getItem('whatsapp_admin_number');
  if (!adminNum) {
    console.info('No WhatsApp Admin number configured. Skipping notification dispatch.');
    return false;
  }
  return sendWhatsappMessage(adminNum, text);
}
