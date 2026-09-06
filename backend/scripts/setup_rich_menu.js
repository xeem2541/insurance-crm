require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const fs = require('fs');

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

const richMenuObject = {
  size: { width: 2500, height: 843 },
  selected: true,
  name: "Main Menu",
  chatBarText: "เมนูลัด",
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: { type: "message", text: "เช็กกรมธรรม์" }
    },
    {
      bounds: { x: 833, y: 0, width: 834, height: 843 },
      action: { type: "message", text: "แจ้งเคลม" }
    },
    {
      bounds: { x: 1667, y: 0, width: 833, height: 843 },
      action: { type: "message", text: "ติดต่อแอดมิน" }
    }
  ]
};

async function setupRichMenu() {
  try {
    console.log('1. Creating Rich Menu object...');
    const createRes = await axios.post('https://api.line.me/v2/bot/richmenu', richMenuObject, {
      headers: {
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    const richMenuId = createRes.data.richMenuId;
    console.log(`Rich Menu ID created: ${richMenuId}`);

    console.log('2. Uploading image... (Requires a rich_menu.jpg in this folder)');
    if (fs.existsSync('./rich_menu.jpg')) {
        const imageBuffer = fs.readFileSync('./rich_menu.jpg');
        await axios.post(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, imageBuffer, {
          headers: {
            'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
            'Content-Type': 'image/jpeg'
          }
        });
        console.log('Image uploaded successfully.');
    } else {
        console.log('⚠️ Warning: rich_menu.jpg not found. Please upload the image manually via API or LINE Manager.');
    }

    console.log('3. Setting as default Rich Menu...');
    await axios.post(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {}, {
      headers: {
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      }
    });
    console.log('🎉 Setup complete! The rich menu is now active for all users.');

  } catch (error) {
    console.error('Error setting up Rich Menu:', error.response?.data || error.message);
  }
}

if (!LINE_ACCESS_TOKEN) {
    console.error('Error: LINE_CHANNEL_ACCESS_TOKEN is missing in .env');
    process.exit(1);
}

setupRichMenu();
