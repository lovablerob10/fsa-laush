// Serviços simplificados para demonstração
export const RAGService = {
  async generateResponse(query: string) {
    return {
      content: `Resposta simulada para: ${query}`,
      sources: ['Documento 1'],
      confidence: 0.9,
      tokens_used: 100,
    };
  }
};

export const WhatsAppService = {
  async sendMessage(phone: string, message: string) {
    console.log(`Enviando para ${phone}: ${message}`);
    return { success: true };
  }
};

export const WebhookService = {
  async processWebhook(data: any) {
    console.log('Processando webhook:', data);
    return { success: true };
  }
};
