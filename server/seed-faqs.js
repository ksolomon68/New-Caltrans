/**
 * Seed script: inserts the original FAQ content into cms_faqs.
 * Run from project root: node server/seed-faqs.js
 * Safe to re-run — skips FAQs that already exist (matches by question).
 */
const { db } = require('./database');

const faqs = [
    // General Questions
    { category: 'General Questions', sort_order: 0, question: 'Do I need to be Small Business certified to use the platform?', answer: '<p>No, you don\'t need Small Business certification to create an account and browse opportunities. However, some opportunities may require Small Business certification. Check the requirements for each opportunity listing.</p><p><strong>How do I get Small Business certified?</strong> Visit our <a href="eligibility.html">Eligibility page</a> to learn about the Small Business certification process, requirements, and how to apply.</p>' },
    { category: 'General Questions', sort_order: 1, question: 'What is a capability statement?', answer: '<p>A capability statement is a one-page document that showcases your business qualifications, past performance, and capabilities. It\'s like a resume for your business.</p><p>You can download our template from the <a href="resources.html">Resources page</a>. Capability statements must be uploaded as PDF files with a maximum size of 10MB.</p>' },
    { category: 'General Questions', sort_order: 2, question: 'How do I apply for an opportunity?', answer: '<p>Each opportunity listing includes contact information for the posting agency. You\'ll need to contact them directly using the information provided and follow their specific application process.</p>' },
    { category: 'General Questions', sort_order: 3, question: 'Can I select multiple work categories?', answer: '<p>Yes, you can select all work categories that apply to your business capabilities. This helps agencies find you when searching for small businesses in those categories.</p>' },

    // For Small Businesses
    { category: 'For Small Businesses', sort_order: 0, question: 'How often are new opportunities posted?', answer: '<p>Opportunities are posted regularly as agencies have new projects. We recommend checking the platform frequently or enabling email notifications for new opportunities in your selected categories.</p>' },
    { category: 'For Small Businesses', sort_order: 1, question: 'How long does it take for an opportunity to be posted?', answer: '<p>Opportunities that meet our quality standards are typically posted within 1–2 business days after submission for review.</p>' },
    { category: 'For Small Businesses', sort_order: 2, question: 'Can I edit an opportunity after it\'s posted?', answer: '<p>Yes, you can edit your posted opportunities through your agency dashboard. Updates will be reflected immediately on the platform.</p>' },
    { category: 'For Small Businesses', sort_order: 3, question: 'How do I search for qualified small businesses?', answer: '<p>Use the small business search feature in your dashboard to filter by work category, district, and certification status. You can review small business profiles and capability statements to find qualified partners.</p>' },

    // For Agencies
    { category: 'For Agencies', sort_order: 0, question: 'Who can post opportunities?', answer: '<p>Caltrans districts, other government agencies, and agencies working on Caltrans projects can post opportunities on the platform.</p>' },
    { category: 'For Agencies', sort_order: 1, question: 'What information is required to post an opportunity?', answer: '<p>You\'ll need to provide project title, description, location (district), work category, timeline, budget range, requirements, and contact information. All fields are required to ensure small businesses receive complete information.</p>' },
    { category: 'For Agencies', sort_order: 2, question: 'How long does it take for an opportunity to be posted?', answer: '<p>Opportunities that meet our quality standards are typically posted within 1–2 business days after submission for review.</p>' },
    { category: 'For Agencies', sort_order: 3, question: 'Can I edit an opportunity after it\'s posted?', answer: '<p>Yes, you can edit your posted opportunities through your agency dashboard. Updates will be reflected immediately on the platform.</p>' },
    { category: 'For Agencies', sort_order: 4, question: 'How do I search for qualified small businesses?', answer: '<p>Use the small business search feature in your dashboard to filter by work category, district, and certification status. You can review small business profiles and capability statements to find qualified partners.</p>' },
    { category: 'For Agencies', sort_order: 5, question: 'What are the quality standards for opportunity postings?', answer: '<p>All postings must include complete project information, clear requirements, realistic timelines, and accurate contact details. This ensures small businesses can make informed decisions about applying.</p>' },

    // Technical Questions
    { category: 'Technical Questions', sort_order: 0, question: 'What browsers are supported?', answer: '<p>CaltransBizConnect works best on the latest versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience.</p>' },
    { category: 'Technical Questions', sort_order: 1, question: 'Is the platform mobile-friendly?', answer: '<p>Yes, CaltransBizConnect is fully responsive and works on smartphones, tablets, and desktop computers.</p>' },
    { category: 'Technical Questions', sort_order: 2, question: 'Is my information secure?', answer: '<p>Yes, we use industry-standard security measures to protect your data. Your personal information is never shared without your consent.</p>' },
    { category: 'Technical Questions', sort_order: 3, question: 'I forgot my password. How do I reset it?', answer: '<p>Click the "Forgot Password" link on the login page and follow the instructions to reset your password via email.</p>' },
];

async function seed() {
    let inserted = 0;
    let skipped = 0;
    for (const faq of faqs) {
        const [existing] = await db.execute(
            'SELECT id FROM cms_faqs WHERE question = ?',
            [faq.question]
        );
        if (existing.length > 0) {
            skipped++;
            continue;
        }
        await db.execute(
            `INSERT INTO cms_faqs (category, question, answer, status, sort_order) VALUES (?, ?, ?, 'active', ?)`,
            [faq.category, faq.question, faq.answer, faq.sort_order]
        );
        inserted++;
    }
    console.log(`Done. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
