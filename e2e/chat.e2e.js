describe('Chat Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
    // Assumir que temos um usuário logado
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Contact List', () => {
    it('should show contact list on main screen', async () => {
      await waitFor(element(by.id('contacts-list')))
        .toBeVisible()
        .withTimeout(10000);

      await expect(element(by.id('add-contact-button'))).toBeVisible();
    });

    it('should allow adding new contact', async () => {
      await element(by.id('add-contact-button')).tap();

      await waitFor(element(by.id('phone-input')))
        .toBeVisible()
        .withTimeout(5000);

      // Número válido de teste
      await element(by.id('phone-input')).typeText('+5511999998888');
      await element(by.id('add-button')).tap();

      // Aguardar confirmação ou erro
      await waitFor(element(by.id('contacts-list')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should handle invalid phone numbers', async () => {
      await element(by.id('add-contact-button')).tap();

      await waitFor(element(by.id('phone-input')))
        .toBeVisible()
        .withTimeout(5000);

      // Número inválido
      await element(by.id('phone-input')).typeText('123');
      await element(by.id('add-button')).tap();

      await expect(
        element(by.text('Número de telefone inválido'))
      ).toBeVisible();
    });
  });

  describe('Chat Interaction', () => {
    beforeEach(async () => {
      // Assumir que temos pelo menos um contato
      await waitFor(element(by.id('contacts-list')))
        .toBeVisible()
        .withTimeout(10000);

      // Tocar no primeiro contato
      await element(by.id('contact-item-0')).tap();

      // Aguardar tela de chat carregar
      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should show chat interface elements', async () => {
      await expect(element(by.id('messages-list'))).toBeVisible();
      await expect(element(by.id('emoji-input'))).toBeVisible();
      await expect(element(by.id('send-button'))).toBeVisible();
      await expect(element(by.id('emoji-picker-button'))).toBeVisible();
    });

    it('should send emoji message successfully', async () => {
      // Abrir seletor de emoji
      await element(by.id('emoji-picker-button')).tap();

      await waitFor(element(by.id('emoji-picker')))
        .toBeVisible()
        .withTimeout(5000);

      // Selecionar emoji 😀
      await element(by.id('emoji-😀')).tap();

      // Verificar se emoji apareceu no input
      await expect(element(by.text('😀'))).toBeVisible();

      // Enviar mensagem
      await element(by.id('send-button')).tap();

      // Verificar se mensagem apareceu na lista
      await waitFor(element(by.id('message-item-sent')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should show message status indicators', async () => {
      // Enviar mensagem
      await element(by.id('emoji-picker-button')).tap();
      await waitFor(element(by.id('emoji-picker')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('emoji-📱')).tap();
      await element(by.id('send-button')).tap();

      // Verificar indicador de pendente
      await expect(element(by.id('message-status-pending'))).toBeVisible();

      // Aguardar entrega (ou timeout para offline)
      await waitFor(element(by.id('message-status-delivered')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should handle offline message queue', async () => {
      // Simular perda de conexão
      await device.setURLBlacklist(['*']);

      // Enviar mensagem offline
      await element(by.id('emoji-picker-button')).tap();
      await waitFor(element(by.id('emoji-picker')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('emoji-📴')).tap();
      await element(by.id('send-button')).tap();

      // Verificar que mensagem fica pendente
      await expect(element(by.id('message-status-pending'))).toBeVisible();

      // Restaurar conexão
      await device.setURLBlacklist([]);

      // Aguardar reenvio automático
      await waitFor(element(by.id('message-status-delivered')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should show typing indicator', async () => {
      // Começar a digitar (selecionar emoji)
      await element(by.id('emoji-picker-button')).tap();

      // Verificar indicador de digitação (se implementado)
      // await expect(element(by.id('typing-indicator'))).toBeVisible();
    });

    it('should handle message history loading', async () => {
      // Scroll para cima para carregar histórico
      await element(by.id('messages-list')).scroll(200, 'up');

      // Verificar loading indicator
      await expect(element(by.id('loading-more-messages'))).toBeVisible();

      // Aguardar carregamento
      await waitFor(element(by.id('loading-more-messages')))
        .not.toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Message Persistence', () => {
    it('should persist messages after app restart', async () => {
      // Enviar uma mensagem única
      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(10000);

      await element(by.id('emoji-picker-button')).tap();
      await waitFor(element(by.id('emoji-picker')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('emoji-🔄')).tap();
      await element(by.id('send-button')).tap();

      // Aguardar mensagem aparecer
      await waitFor(element(by.id('message-item-sent')))
        .toBeVisible()
        .withTimeout(5000);

      // Reiniciar app
      await device.terminateApp();
      await device.launchApp();

      // Navegar de volta para o chat
      await waitFor(element(by.id('contacts-list')))
        .toBeVisible()
        .withTimeout(10000);

      await element(by.id('contact-item-0')).tap();

      // Verificar que mensagem ainda está lá
      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(5000);

      await expect(element(by.text('🔄'))).toBeVisible();
    });

    it('should handle app backgrounding during chat', async () => {
      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Colocar em background
      await device.sendToHome();

      // Aguardar e reabrir
      await new Promise(resolve => setTimeout(resolve, 3000));
      await device.launchApp({ newInstance: false });

      // Deve voltar para o chat
      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Error Handling', () => {
    it('should show error when contact is unavailable', async () => {
      // Simular erro de rede específico
      await device.setURLBlacklist(['*firebase*']);

      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(10000);

      await element(by.id('emoji-picker-button')).tap();
      await waitFor(element(by.id('emoji-picker')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('emoji-❌')).tap();
      await element(by.id('send-button')).tap();

      // Aguardar mensagem de erro
      await waitFor(element(by.text('Erro ao enviar mensagem')))
        .toBeVisible()
        .withTimeout(5000);

      // Restaurar rede
      await device.setURLBlacklist([]);
    });

    it('should retry failed messages', async () => {
      // Verificar se existe botão de retry para mensagens falhas
      await waitFor(element(by.id('retry-message-button')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('retry-message-button')).tap();

      // Aguardar nova tentativa
      await waitFor(element(by.id('message-status-pending')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Navigation', () => {
    it('should navigate back to contacts from chat', async () => {
      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Voltar para lista de contatos
      await element(by.id('back-button')).tap();

      await waitFor(element(by.id('contacts-list')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should show contact info when tapping header', async () => {
      await waitFor(element(by.id('chat-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Tocar no header do contato
      await element(by.id('chat-header')).tap();

      // Verificar se modal de info aparece
      await waitFor(element(by.id('contact-info-modal')))
        .toBeVisible()
        .withTimeout(5000);

      // Fechar modal
      await element(by.id('close-modal-button')).tap();

      await expect(element(by.id('contact-info-modal'))).not.toBeVisible();
    });
  });
});
