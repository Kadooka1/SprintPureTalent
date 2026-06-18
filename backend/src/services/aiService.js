const fs    = require('fs');
const path  = require('path');

async function extractText(filePath, fileType) {
  if (fileType === 'pdf') {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text.trim();
  }

  // Image: Tesseract OCR
  const { createWorker } = require('tesseract.js');
  const worker = await createWorker('eng', 1, { logger: () => {} });
  try {
    const { data: { text } } = await worker.recognize(filePath);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

function buildPrompt(extractedText) {
  return `Você é um sistema de análise de certificados de TI.
Analise o texto extraído abaixo e retorne um JSON com EXATAMENTE estes campos:
{
  "course_name": "nome do curso/certificação",
  "institution": "nome da instituição emissora",
  "conclusion_date": "YYYY-MM-DD ou null",
  "workload_hours": número_inteiro_ou_null,
  "institution_weight": número_0_a_100,
  "skills": [
    { "name": "nome canônico da skill", "relevance": número_0_a_100 }
  ],
  "confidence": número_0_a_100
}

Regras IMPORTANTES para o campo institution_weight:
- Avalie o peso da instituição especificamente para o mercado de TI (0 a 100)
- 85–100: instituição 100% especializada em TI e reconhecida pelo mercado — ex: Alura, Rocketseat, FIAP, DIO, Trybe, Ada Tech, 42 São Paulo
- 70–84: universidade/faculdade com curso de TI forte e reconhecido — ex: PUC, FGV, UNICAMP (ciências da computação), ITA, IME
- 50–69: universidade geral com cursos de TI — ex: USP, UFMG, UFRJ, UFSC (cursos de TI existem mas não é foco da instituição)
- 35–49: plataforma global de cursos online — ex: Udemy, Coursera, LinkedIn Learning, edX
- 20–34: instituição pouco conhecida no mercado de TI ou sem histórico claro
- 0–19: instituição desconhecida ou sem credibilidade identificável

Regras IMPORTANTES para o campo skills:
- Use SEMPRE nomes canônicos em inglês conforme aparecem em vagas de emprego de TI
- Exemplos corretos: "JavaScript", "Python", "React", "Node.js", "SQL", "MySQL", "MongoDB", "Docker", "AWS", "Linux", "TypeScript", "PHP", "Java", "C#", "HTML/CSS", "Git", "Cybersecurity", "Pentest", "Machine Learning", "Data Analysis", "Power BI", "PostgreSQL", "Redis", "Angular", "Vue.js", "Express.js", "NestJS", "Spring", "Laravel", "Django", "Azure", "GCP", "Kubernetes", "CI/CD", "LGPD"
- NÃO use termos genéricos em português como "Desenvolvimento Web", "Segurança da Informação", "Banco de Dados" — use o nome da tecnologia específica
- Se o curso for de Cibersegurança, use: "Cybersecurity", "Pentest", "Linux" conforme o conteúdo
- relevance: 0 = tangencial, 100 = foco principal do curso
- confidence: 0 = ilegível/inválido, 100 = certeza absoluta
- Se o texto não parecer um certificado real, retorne confidence abaixo de 50
- Responda APENAS com o JSON, sem texto adicional

Texto do certificado:
${extractedText.slice(0, 4000)}`;
}

async function analyzeCertificate(extractedText) {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY não configurada. Configure a variável no .env para habilitar a análise por IA.');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = buildPrompt(extractedText);
  const t0 = Date.now();

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const durationMs = Date.now() - t0;
  const rawContent = response.choices[0].message.content;
  const parsed = JSON.parse(rawContent);

  return {
    courseName:     parsed.course_name     || '',
    institution:    parsed.institution     || '',
    conclusionDate: parsed.conclusion_date || null,
    workloadHours:  parsed.workload_hours  || null,
    skills:             Array.isArray(parsed.skills) ? parsed.skills : [],
    confidence:         typeof parsed.confidence        === 'number' ? parsed.confidence        : 0,
    institutionWeight:  typeof parsed.institution_weight === 'number' ? parsed.institution_weight : null,
    tokensUsed:     response.usage?.total_tokens || null,
    durationMs,
    promptSent:     prompt,
    responseRaw:    rawContent,
  };
}

module.exports = { extractText, analyzeCertificate };
