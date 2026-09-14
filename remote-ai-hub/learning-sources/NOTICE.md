# مصادر الدروس العربية

تاريخ إعداد النسخة العربية: 2026-09-14.

تحتوي صفحات مدار على **29 درساً**: 21 درساً للمسارات السبعة المرتبطة بالدورات المجانية، و8 دروس تمهيدية للموضوعات الأخرى. ستة دروس تتضمن ترجمات منتقاة أو بتصرف من المصادر المفتوحة أدناه؛ بقية الدروس والأمثلة والتمارين شروح عربية مستقلة من إعداد مدار.

هذه الصفحات ليست نسخاً كاملة لدورات NVIDIA DLI، وليست ترجمة رسمية أو معتمدة. لم تُنقل فيديوهات الدورات أو محتويات حسابات المتعلمين أو مختبرات DLI أو اختبارات الشهادات. أسعار الدورات الأصلية ومددها محفوظة في دليل الموارد، ولا تمثل مدة أو تكلفة الدروس العربية.

## نطاق الترجمات وتعديلاتها

| درس مدار | المادة الأصلية | نطاق النقل والتعديل |
| --- | --- | --- |
| فهم الذكاء الاصطناعي التوليدي: كيف يدخل المصدر في الإجابة؟ | GenerativeAIExamples / langchain_basic_RAG.ipynb | ترجمة مختارة لشروح تقسيم الوثائق والتضمين والبحث وإعادة الترتيب؛ حُذفت الأكواد والمخرجات، وأضيف مثال عربي وتمرين. |
| NIM: ما هي NIM؟ | الدفتر نفسه | ترجمة مختارة لتعريف الخدمات وتكاملها؛ حُذفت تفاصيل النماذج القديمة وأضيف جدول توضيحي. |
| NIM: تجهيز دفاتر RAG محلياً | RAG/notebooks/README.md | ترجمة بتصرف لخطوات تجهيز البيئة؛ استُبدل تشغيل Jupyter دون رمز دخول وباستماع عام بتشغيل محلي يحتفظ بالمصادقة. |
| Jetson: أربع مراحل لتجنّب الاصطدام | JetBot / docs/examples/collision_avoidance.md | ترجمة بتصرف للمراحل الأربع؛ أُزيلت الوسائط وبيانات الدخول الافتراضية، واستُخدم مسار دفتر التحسين الصحيح، وأضيف تمرين. |
| CUDA: جمع المتجهات بالذاكرة الموحّدة | CUDA Samples / cpp/0_Introduction/vectorAdd/README.md | ترجمة للشروح والمفاهيم والتشغيل، مع تجميع المتطلبات وإضافة تمرين. لم يُنقل البرنامج التنفيذي. |
| الصحة الرقمية: بنية Smart Health Agent | community/smart-health-agent/README.md | ترجمة منتقاة للنظرة العامة والبنية ومعالجة الوثائق؛ لم تُنقل خطوات ربط الحسابات أو نشر الخدمة، والأمثلة العربية مصطنعة. |

لم تُنقل صور أو فيديوهات أو أوزان نماذج. ملفات الإنجليزية المجاورة محفوظة لتوثيق المصادر، ولا تُنفذ تلقائياً. ملف rag-langchain-excerpts.en.md يحتوي على خلايا شرح منتقاة من دفتر العمل، وليس الدفتر كاملاً.

## NVIDIA GenerativeAIExamples — Apache-2.0

- [المستودع عند النسخة المرجعية](https://github.com/NVIDIA/GenerativeAIExamples/tree/203b0de48d1142124842d56d4b40f3733888f5ee)
- [الرخصة الأصلية](https://github.com/NVIDIA/GenerativeAIExamples/blob/203b0de48d1142124842d56d4b40f3733888f5ee/LICENSE.md)
- [نسخة الرخصة المحفوظة](../licenses/generative-ai-Apache-2.0.txt)

Copyright (c) 2023 NVIDIA CORPORATION & AFFILIATES. All rights reserved.

Copyright (c) 2025 NVIDIA CORPORATION & AFFILIATES. All rights reserved.

Copyright NVIDIA Corporation and contributors.

Licensed under the Apache License, Version 2.0. Copies and modified translations retain the applicable original attribution. The changes made by Madar are identified above and in the reader.

The original RAG notebook cites LangChain tutorials for related background. Original links and acknowledgments in the selected source cells are retained. The notebook's separate introductory RAG definition, attributed to the LangChain v0.2 tutorial, was not reproduced in the Arabic lessons.

The open-source example license does not automatically license model weights, hosted endpoints, NVIDIA NIM containers, or third-party data. None are bundled here.

## NVIDIA AI IOT JetBot — MIT

- [المستودع عند النسخة المرجعية](https://github.com/NVIDIA-AI-IOT/jetbot/tree/3ebfff2b2341378b959b790aaef612da5322da83)
- [الرخصة الأصلية](https://github.com/NVIDIA-AI-IOT/jetbot/blob/3ebfff2b2341378b959b790aaef612da5322da83/LICENSE.md)
- [نسخة الرخصة المحفوظة](../licenses/jetbot-MIT.txt)

Copyright (c) 2019, NVIDIA CORPORATION. All rights reserved.

The MIT copyright and permission notice is distributed in full with the original source snapshot and modified Arabic translation.

## NVIDIA CUDA Samples — BSD-3-Clause

- [المستودع عند النسخة المرجعية](https://github.com/NVIDIA/cuda-samples/tree/5443602d89ed99aede2e4b7bf329daddeadb320e)
- [الرخصة الأصلية](https://github.com/NVIDIA/cuda-samples/blob/5443602d89ed99aede2e4b7bf329daddeadb320e/LICENSE)
- [نسخة الرخصة المحفوظة](../licenses/cuda-samples-BSD-3-Clause.txt)

Copyright (c) 2022, NVIDIA CORPORATION. All rights reserved.

The full redistribution conditions and disclaimer accompany the source snapshot and modified Arabic translation. NVIDIA and contributor names are used for attribution, without implying endorsement.

## الشروح المستقلة

الشروح التي لا تحمل وسم «ترجمة بتصرف من مصدر مفتوح» من إعداد مدار، وتستخدم أمثلة تعليمية مضافة. مراجعة المحتوى هنا لا تمنح شهادة إتمام من NVIDIA. عند تشغيل مثال على جهازك، ارجع إلى إصدار المصدر ومتطلباته؛ لم تُختبر بيئات GPU أو الروبوتات أو الخدمات المستضافة أثناء إعداد هذه الصفحات.
