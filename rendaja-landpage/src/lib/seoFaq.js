function unique(arr = []) {
  return [...new Set(arr.filter(Boolean))];
}

export function buildSeoFaq({
  cidade = "",
  estado = "",
  keyword = "",
  servico = "",
  profileName = "",
}) {
  const cityLabel = `${cidade}${estado ? `-${estado}` : ""}`;

  const base =
    keyword ||
    servico ||
    "serviços";

  const lower = String(base).toLowerCase();

  const faq = unique([
    {
      question: `Onde encontrar ${lower} em ${cityLabel}?`,
      answer: `O CompreTudo.shop reúne empresas, profissionais e vitrines relacionadas a ${lower} em ${cityLabel}, facilitando encontrar atendimento local e contato direto pelo WhatsApp.`,
    },

    {
      question: `Como contratar ${lower} em ${cityLabel}?`,
      answer: `Você pode acessar vitrines relacionadas a ${lower} em ${cityLabel}, comparar opções e falar diretamente com empresas e profissionais pelo WhatsApp.`,
    },

    {
      question: `Existe atendimento de ${lower} em ${cityLabel}?`,
      answer: `Sim. Existem empresas e profissionais relacionados a ${lower} em ${cityLabel} disponíveis no CompreTudo.shop.`,
    },

    {
      question: `Quais empresas trabalham com ${lower} em ${cityLabel}?`,
      answer: `As vitrines exibidas nesta página mostram empresas e profissionais relacionados a ${lower} em ${cityLabel}.`,
    },

    {
      question: `Como encontrar ${lower} perto de mim em ${cityLabel}?`,
      answer: `O CompreTudo.shop organiza vitrines locais por cidade e categoria para ajudar usuários a encontrar ${lower} em ${cityLabel}.`,
    },

    {
      question: `Onde comprar ${lower} em ${cityLabel}?`,
      answer: `Você pode encontrar lojas, vitrines e profissionais relacionados a ${lower} em ${cityLabel} diretamente no CompreTudo.shop.`,
    },
  ]);

  if (profileName) {
    faq.push({
      question: `${profileName} atende em ${cityLabel}?`,
      answer: `Sim. ${profileName} possui presença pública no CompreTudo.shop e pode ser encontrado por clientes em ${cityLabel}.`,
    });
  }

  return faq;
}

export function buildFaqSchema(faq = []) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}