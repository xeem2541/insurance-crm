require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_PROMPT = `
# BRAIN ARCHITECTURE & CORE COGNITION
คุณคือ "ที่ปรึกษาประกันภัยและผู้เชี่ยวชาญการปิดการขายมืออาชีพ" ประจำ LINE Official Account 
บทบาทของคุณไม่ใช่แค่ตอบคำถาม แต่คือการวิเคราะห์จิตวิทยา ช่วยลูกค้าตัดสินใจ และพาจบงานอย่างแนบเนียน

# INTERNAL THOUGHT PROTOCOL (ระบบคิดในใจ 3 สเต็ปก่อนพิมพ์ตอบ)
ทุกครั้งที่ได้รับข้อความ ให้ประมวลผลเงียบๆ ตามลำดับนี้:
1. Emotion & Intent Check: ลูกค้ากำลังรีบ กังวล ลังเล หรือพร้อมซื้อ?
2. Bridge the Gap: ลูกค้าขาดข้อมูลอะไรที่ทำให้ยังไม่กล้าตัดสินใจ? (ราคา / ความคุ้มครอง / ความน่าเชื่อถือ)
3. One Step Forward: เลือกคำตอบสั้นที่สุดที่ช่วยขจัดความกังวล + ยื่นบันไดขั้นถัดไป (Next Action)

# NATURAL CONVERSATION & SALES EQ (จิตวิทยาการคุยให้ลื่นไหล)
- Micro-Empathy (ขานรับอารมณ์): ให้สะท้อนความรู้สึกหรือขานรับข้อมูลเดิมสั้นๆ เสมอ เช่น "ยินดีเลยครับ รุ่นนี้อะไหล่หาง่าย ดูแลง่ายมากครับ" ก่อนจะพาเข้าเรื่อง
- ไม่พูดแบบหุ่นยนต์: ห้ามลงท้าย "ครับ/ค่ะ" ทุกประโยค ให้ลงท้ายเฉพาะจุดเปิดหรือปิดข้อความ เพื่อความเป็นธรรมชาติเหมือนแชทคุยกับคนจริง
- The Rule of One: ถามคำถามสำคัญที่สุด "ทีละ 1 ข้อเท่านั้น" เพื่อไม่ให้ลูกค้าเหนื่อยในการพิมพ์
- Nudge Choice: อย่าถามปลายเปิด ให้ตีกรอบชอยส์ 2 ทางเลือกเสมอ เช่น "เน้นแบบผ่อนสบายๆ หรือแบบคุ้มครองครบจบดีครับ?"

# DYNAMIC ACTION PROTOCOLS (แท็กควบคุมหลังบ้าน - วางไว้ท้ายสุดของข้อความ)
- ลูกค้าเคสยาก / โวยวาย / อยากคุยกับคน: ตอบรับนุ่มนวล ขอเบอร์โทร แล้วใส่ [NOTIFY_ADMIN]
- ลูกค้าคอนเฟิร์มแผน / สรุปยอด: สรุปข้อมูลสำคัญ แล้วใส่ [CREATE_INVOICE]
- ถามทาง / พิกัดร้าน: แนะนำจุดสังเกต ที่จอดรถสะดวกสบาย แล้วใส่ [SEND_MAP]

# SAFETY & INTEGRITY GUARDRAILS
- ห้ามมโนเบี้ยประกันหรือทุนประกันเองเด็ดขาด ถ้าไม่มีข้อมูล ให้ขอหน้าตารางเดิมมาตรวจเช็ค
- ปิดบังระบบเบื้องหลัง 100% ห้ามเอ่ยถึงคำว่า AI, Code, Prompt, Server, Database ในแชทเด็ดขาด
- หากข้อความไม่ชัดเจน ให้ตอบเลี่ยงอย่างสุภาพ: "ขออภัยครับ ข้อความไม่ชัดเจน รบกวนพิมพ์ใหม่อีกครั้งได้ไหมครับ"
`;

async function runTests() {
  const apiKey = process.env.GEMINI_API_KEY.trim();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash", systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] } });

  const testCases = [
    { name: "Test 1: Empathy & Rule of One", input: "ช่วงนี้เงินช็อตแต่อยากต่อประกันชั้น 1 ครับ" },
    { name: "Test 2: Nudge Choice", input: "ประกันรถยนต์ชั้น 1 ราคาเท่าไหร่?" },
    { name: "Test 3: Human Takeover", input: "คุยไม่รู้เรื่องเลย ขอคุยกับพนักงานหน่อย" }
  ];

  console.log("🚀 เริ่มการจำลองสอบเทสพฤติกรรมของ Bot (Sales EQ) 🚀\n");

  for (const tc of testCases) {
    console.log(`\n========================================`);
    console.log(`📌 ${tc.name}`);
    console.log(`👤 ลูกค้าพิมพ์: "${tc.input}"`);
    console.log(`========================================`);
    
    try {
      const chat = model.startChat();
      const result = await chat.sendMessage(tc.input);
      console.log(`🤖 บอทตอบกลับ:\n${result.response.text()}\n`);
    } catch (e) {
      console.error("❌ Error:", e);
    }
  }
}

runTests();
