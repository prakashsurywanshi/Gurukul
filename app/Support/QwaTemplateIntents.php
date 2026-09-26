<?php

namespace App\Support;

/**
 * Canonical QWA template intents with per-language message content.
 *
 * Regional (Marathi / Hindi) variants keep the exact same {{placeholders}}
 * tokens as the English master so the variable mapping stays identical
 * across languages. The `template_name` values match the synced gateway
 * template names so migrations and seeders can group them under one
 * `variant_key`.
 *
 * @see \Database\Seeders\QwaRegionalTemplateSeeder
 */
final class QwaTemplateIntents
{
    public const LANGUAGE_ENGLISH = LanguageCatalog::ENGLISH;

    public const LANGUAGE_MARATHI = LanguageCatalog::MARATHI;

    public const LANGUAGE_HINDI = LanguageCatalog::HINDI;

    /**
     * @return array<int, array{
     *     key: string,
     *     template_name: string,
     *     messages: array<string, array{header: string|null, body: string, footer: string|null}>
     * }>
     */
    public static function all(): array
    {
        return [
            [
                'key' => 'fee_receipt',
                'template_name' => 'fee_receipt_confirmation',
                'messages' => [
                    'en' => [
                        'header' => 'Dear {{parent_name}},',
                        'body' => "We have successfully received the payment of ₹{{amount}} towards the fees of {{student_name}}.\n\nReceipt Number: {{receipt_no}}\nPayment Date: {{payment_date}}\n\nThank you for your payment.",
                        'footer' => 'Regards, {{school_name}}',
                    ],
                    'mr' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "आम्हाला {{student_name}} यांच्या फीसाठी ₹{{amount}} ही रक्कम यशस्वीरित्या प्राप्त झाली आहे.\n\nपावती क्रमांक: {{receipt_no}}\nदेयक तारीख: {{payment_date}}\n\nरक्कम भरल्याबद्दल धन्यवाद.",
                        'footer' => 'शुभेच्छा, {{school_name}}',
                    ],
                    'hi' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "हमें {{student_name}} की फीस में ₹{{amount}} की राशि सफलतापूर्वक प्राप्त हुई है।\n\nरसीद संख्या: {{receipt_no}}\nभुगतान दिनांक: {{payment_date}}\n\nभुगतान के लिए धन्यवाद।",
                        'footer' => 'सादर, {{school_name}}',
                    ],
                ],
            ],
            [
                'key' => 'parent_meeting',
                'template_name' => 'parent_meeting_invitation',
                'messages' => [
                    'en' => [
                        'header' => 'Dear {{parent_name}},',
                        'body' => "You are invited to attend the Parent-Teacher Meeting for {{student_name}}.\n\nDate: {{meeting_date}}\nTime: {{meeting_time}}\nVenue: {{venue}}\n\nWe look forward to meeting you.",
                        'footer' => 'Regards, {{school_name}}',
                    ],
                    'mr' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "{{student_name}} यांच्या पालक-शिक्षक बैठकीसाठी आपण उपस्थित राहावे, असे आम्हाला वाटते.\n\nदिनांक: {{meeting_date}}\nवेळ: {{meeting_time}}\nठिकाण: {{venue}}\n\nआपल्या भेटीची उत्सुकतेने वाट पाहत आहोत.",
                        'footer' => 'शुभेच्छा, {{school_name}}',
                    ],
                    'hi' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "{{student_name}} की अभिभावक-शिक्षक बैठक में शामिल होने हेतु आपको आमंत्रित किया जाता है।\n\nदिनांक: {{meeting_date}}\nसमय: {{meeting_time}}\nस्थान: {{venue}}\n\nआपसे मिलने की प्रतीक्षा रहेगी।",
                        'footer' => 'सादर, {{school_name}}',
                    ],
                ],
            ],
            [
                'key' => 'birthday',
                'template_name' => 'birthday_wishes',
                'messages' => [
                    'en' => [
                        'header' => '🎉 Happy Birthday, {{student_name}}! 🎂',
                        'body' => 'Wishing you a wonderful year filled with happiness, success, and memorable moments.',
                        'footer' => 'Best wishes from the entire {{school_name}} family.',
                    ],
                    'mr' => [
                        'header' => '🎉 {{student_name}}, जन्मदिनाच्या हार्दिक शुभेच्छा! 🎂',
                        'body' => 'आपल्याला आनंद, यश आणि आठवणीत राहणाऱ्या क्षणांनी भरलेले एक सुंदर वर्ष लाभो.',
                        'footer' => 'संपूर्ण {{school_name}} कुटुंबाकडून हार्दिक शुभेच्छा.',
                    ],
                    'hi' => [
                        'header' => '🎉 {{student_name}} जी, जन्मदिन की हार्दिक शुभकामनाएँ! 🎂',
                        'body' => 'आपको खुशियों, सफलता और यादगार पलों से भरा एक अद्भुत वर्ष मिले।',
                        'footer' => 'पूरे {{school_name}} परिवार की ओर से शुभकामनाएँ।',
                    ],
                ],
            ],
            [
                'key' => 'holiday',
                'template_name' => 'holiday_announcement',
                'messages' => [
                    'en' => [
                        'header' => 'Dear Parents,',
                        'body' => "Please note that {{school_name}} will remain closed on {{holiday_date}} due to {{holiday_reason}}.\n\nRegular classes will resume on {{resume_date}}.",
                        'footer' => 'Regards, {{school_name}}',
                    ],
                    'mr' => [
                        'header' => 'प्रिय पालकांनो,',
                        'body' => "कृपया लक्षात घ्यावे की {{school_name}} ही {{holiday_reason}} मुळे {{holiday_date}} रोजी बंद राहील.\n\nनियमित वर्ग {{resume_date}} रोजी पुन्हा सुरू होतील.",
                        'footer' => 'शुभेच्छा, {{school_name}}',
                    ],
                    'hi' => [
                        'header' => 'प्रिय अभिभावकों,',
                        'body' => "कृपया ध्यान दें कि {{school_name}} {{holiday_reason}} के कारण {{holiday_date}} को बंद रहेगा।\n\nनियमित कक्षाएँ {{resume_date}} से पुनः प्रारंभ होंगी।",
                        'footer' => 'सादर, {{school_name}}',
                    ],
                ],
            ],
            [
                'key' => 'bus_arrival',
                'template_name' => 'bus_arrival_notification',
                'messages' => [
                    'en' => [
                        'header' => 'Dear {{parent_name}},',
                        'body' => 'The school bus for {{student_name}} is expected to arrive at {{stop_name}} in approximately {{arrival_time}} minutes.',
                        'footer' => 'Thank you.',
                    ],
                    'mr' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => '{{student_name}} यांच्यासाठीची शालेय बस {{stop_name}} येथे साधारणपणे {{arrival_time}} मिनिटांत पोहोचण्याची अपेक्षा आहे.',
                        'footer' => 'धन्यवाद.',
                    ],
                    'hi' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => '{{student_name}} के लिए स्कूल बस {{stop_name}} पर लगभग {{arrival_time}} मिनट में पहुँचने की संभावना है।',
                        'footer' => 'धन्यवाद।',
                    ],
                ],
            ],
            [
                'key' => 'exam_result',
                'template_name' => 'exam_result_notification',
                'messages' => [
                    'en' => [
                        'header' => 'Dear {{parent_name}},',
                        'body' => "The results for {{exam_name}} are now available for {{student_name}}.\n\nTotal Marks: {{marks_obtained}} / {{total_marks}}\n\nPlease log in to the parent portal for detailed results.",
                        'footer' => 'Regards, {{school_name}}',
                    ],
                    'mr' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "{{exam_name}} चे निकाल आता {{student_name}} साठी उपलब्ध आहेत.\n\nएकूण गुण: {{marks_obtained}} / {{total_marks}}\n\nतपशीलवार निकालासाठी कृपया पालक पोर्टलमध्ये लॉग इन करा.",
                        'footer' => 'शुभेच्छा, {{school_name}}',
                    ],
                    'hi' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "{{exam_name}} के परिणाम अब {{student_name}} के लिए उपलब्ध हैं।\n\nकुल अंक: {{marks_obtained}} / {{total_marks}}\n\nविस्तृत परिणामों के लिए कृपया अभिभावक पोर्टल में लॉग इन करें।",
                        'footer' => 'सादर, {{school_name}}',
                    ],
                ],
            ],
            [
                'key' => 'homework',
                'template_name' => 'homework_notification',
                'messages' => [
                    'en' => [
                        'header' => 'Dear {{parent_name}},',
                        'body' => "Homework has been assigned to {{student_name}} for {{subject}}.\n\nHomework: {{homework_details}}\n\nSubmission Date: {{submission_date}}",
                        'footer' => 'Regards, {{school_name}}',
                    ],
                    'mr' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "{{student_name}} यांना {{subject}} या विषयाचे गृहपाठ देण्यात आले आहे.\n\nगृहपाठ: {{homework_details}}\n\nसादर करण्याची तारीख: {{submission_date}}",
                        'footer' => 'शुभेच्छा, {{school_name}}',
                    ],
                    'hi' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "{{student_name}} को {{subject}} विषय का गृहकार्य दिया गया है।\n\nगृहकार्य: {{homework_details}}\n\nजमा करने की तिथि: {{submission_date}}",
                        'footer' => 'सादर, {{school_name}}',
                    ],
                ],
            ],
            [
                'key' => 'attendance_alert',
                'template_name' => 'attendance_alert',
                'messages' => [
                    'en' => [
                        'header' => 'Dear {{parent_name}},',
                        'body' => "This is to inform you that {{student_name}} was marked {{attendance_status}} on {{date}}.\n\nFor any queries, please contact the school administration.",
                        'footer' => 'Regards, {{school_name}}',
                    ],
                    'mr' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "{{student_name}} हे {{date}} रोजी {{attendance_status}} म्हणून नोंदवले गेल्याची माहिती आपणास देत आहोत.\n\nकोणत्याही प्रश्नांसाठी कृपया शाळेच्या प्रशासनाशी संपर्क साधा.",
                        'footer' => 'शुभेच्छा, {{school_name}}',
                    ],
                    'hi' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "आपको सूचित किया जाता है कि {{student_name}} को {{date}} को {{attendance_status}} के रूप में दर्ज किया गया।\n\nकिसी भी प्रश्न के लिए कृपया विद्यालय प्रशासन से संपर्क करें।",
                        'footer' => 'सादर, {{school_name}}',
                    ],
                ],
            ],
            [
                'key' => 'fee_reminder',
                'template_name' => 'fee_payment_reminder',
                'messages' => [
                    'en' => [
                        'header' => 'Dear {{parent_name}},',
                        'body' => "This is a reminder that the fee amount of ₹{{amount}} for {{student_name}} is due on {{due_date}}.\n\nPlease make the payment on or before the due date to avoid late fees.",
                        'footer' => 'Regards, {{school_name}}',
                    ],
                    'mr' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "आपणास कळविले जाते की {{student_name}} यांच्या ₹{{amount}} फीची रक्कम {{due_date}} रोजी देय आहे.\n\nउशीर शुल्क टाळण्यासाठी कृपया देय तारखेला किंवा त्याआधी रक्कम भरावी.",
                        'footer' => 'शुभेच्छा, {{school_name}}',
                    ],
                    'hi' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "आपको स्मरण कराया जाता है कि {{student_name}} की ₹{{amount}} फीस की राशि {{due_date}} को देय है।\n\nविलंब शुल्क से बचने के लिए कृपया देय तिथि को या उससे पहले भुगतान करें।",
                        'footer' => 'सादर, {{school_name}}',
                    ],
                ],
            ],
            [
                'key' => 'admission',
                'template_name' => 'admission_confirmation',
                'messages' => [
                    'en' => [
                        'header' => 'Dear {{parent_name}},',
                        'body' => "We are pleased to inform you that the admission of {{student_name}} to {{school_name}} for {{academic_year}} has been successfully confirmed.\n\nAdmission Number: {{admission_no}}",
                        'footer' => 'Thank you for choosing {{school_name}}.',
                    ],
                    'mr' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "{{student_name}} यांचे {{school_name}} मध्ये {{academic_year}} या शैक्षणिक वर्षासाठीचे प्रवेश यशस्वीरित्या निश्चित झाल्याची माहिती आनंदाने देत आहोत.\n\nप्रवेश क्रमांक: {{admission_no}}",
                        'footer' => '{{school_name}} ची निवड केल्याबद्दल धन्यवाद.',
                    ],
                    'hi' => [
                        'header' => 'प्रिय {{parent_name}},',
                        'body' => "हमें यह बताते हुए हर्ष है कि {{student_name}} का {{school_name}} में शैक्षणिक वर्ष {{academic_year}} के लिए प्रवेश सफलतापूर्वक पुष्ट हो गया है।\n\nप्रवेश संख्या: {{admission_no}}",
                        'footer' => '{{school_name}} को चुनने के लिए धन्यवाद।',
                    ],
                ],
            ],
        ];
    }

    /**
     * The intent key that matches a synced gateway template name, if any.
     */
    public static function keyForName(string $name): ?string
    {
        foreach (self::all() as $intent) {
            if (strtolower(trim($name)) === strtolower(trim($intent['template_name']))) {
                return $intent['key'];
            }
        }

        return null;
    }

    /**
     * The synced gateway template name for an intent key.
     */
    public static function templateName(string $key): ?string
    {
        foreach (self::all() as $intent) {
            if ($intent['key'] === $key) {
                return $intent['template_name'];
            }
        }

        return null;
    }

    /**
     * The localized message block for an intent key.
     *
     * @return array{header: string|null, body: string, footer: string|null}|null
     */
    public static function message(string $key, string $language): ?array
    {
        foreach (self::all() as $intent) {
            if ($intent['key'] === $key) {
                return $intent['messages'][$language] ?? null;
            }
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    public static function languageCodes(): array
    {
        return [self::LANGUAGE_ENGLISH, self::LANGUAGE_MARATHI, self::LANGUAGE_HINDI];
    }

    /**
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }
}