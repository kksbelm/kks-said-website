// api/submit-request.js
// هذا الملف يعمل على Vercel Serverless Functions

export default async function handler(req, res) {
    // السماح فقط بـ POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'الطريقة غير مسموحة' });
    }

    try {
        // استلام البيانات من العميل
        const { name, phone, service, city, details, date, time } = req.body;

        // التحقق من البيانات المطلوبة
        if (!name || !phone) {
            return res.status(400).json({ error: 'الاسم ورقم الهاتف مطلوبان' });
        }

        // قراءة المتغيرات من Environment Variables (Vercel)
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const GITHUB_REPO = process.env.GITHUB_REPO || 'kksbelm/kks-said-website';

        // التحقق من وجود التوكن
        if (!GITHUB_TOKEN) {
            console.error('❌ GITHUB_TOKEN غير موجود في متغيرات البيئة');
            return res.status(500).json({ error: 'خطأ في إعدادات السيرفر' });
        }

        // إنشاء محتوى الـ Issue
        const title = `طلب خدمة: ${name} - ${service}`;
        const body = `
**👤 العميل:** ${name}
**📞 الهاتف:** ${phone}
**🛠️ الخدمة:** ${service}
**📍 المدينة:** ${city || 'أوسنابروك'}
**📅 التاريخ:** ${date || 'غير محدد'}
**🕐 الوقت:** ${time || 'غير محدد'}

**📝 التفاصيل:**
${details || 'لا توجد تفاصيل إضافية'}

---
*تم الإرسال عبر نظام KKS الإلكتروني*
*تاريخ الإرسال: ${new Date().toLocaleString('ar-SA')}*
        `;

        // إرسال الطلب إلى GitHub Issues
        console.log(`📤 إرسال طلب إلى GitHub: ${title}`);
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                title: title,
                body: body,
                labels: ['طلب جديد', 'pending', service]
            })
        });

        const data = await response.json();

        // التحقق من نجاح الإرسال
        if (!response.ok) {
            console.error('❌ GitHub API Error:', data);
            return res.status(response.status).json({ 
                error: data.message || 'فشل الإرسال إلى GitHub' 
            });
        }

        console.log(`✅ تم إنشاء Issue #${data.number}: ${data.html_url}`);

        // ============================================
        // 📱 إرسال إشعار تليجرام (اختياري)
        // ============================================
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            try {
                const telegramMsg = `
🆕 *طلب خدمة جديد!*

👤 *العميل:* ${name}
📞 *الهاتف:* ${phone}
🛠️ *الخدمة:* ${service}
📍 *المدينة:* ${city || 'أوسنابروك'}
📅 *التاريخ:* ${date || 'غير محدد'}
🕐 *الوقت:* ${time || 'غير محدد'}

🔗 *رابط الطلب:* ${data.html_url}
📋 *رقم الطلب:* #${data.number}
                `;
                
                await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: process.env.TELEGRAM_CHAT_ID,
                        text: telegramMsg,
                        parse_mode: 'Markdown'
                    })
                });
                console.log('✅ تم إرسال إشعار تليجرام');
            } catch (tgError) {
                console.error('❌ خطأ في تليجرام:', tgError.message);
            }
        }

        // ============================================
        // ✅ الرد على العميل
        // ============================================
        return res.status(200).json({
            success: true,
            message: '✅ تم إرسال طلبك بنجاح! سيتم التواصل معك قريباً',
            issue_id: data.number,
            issue_url: data.html_url
        });

    } catch (error) {
        console.error('❌ Server Error:', error);
        return res.status(500).json({ 
            error: 'حدث خطأ في السيرفر: ' + error.message 
        });
    }
}
