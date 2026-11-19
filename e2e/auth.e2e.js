describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Phone Authentication', () => {
    it('should show phone input screen initially', async () => {
      await expect(element(by.id('phone-input'))).toBeVisible();
      await expect(element(by.id('country-picker'))).toBeVisible();
      await expect(element(by.id('send-code-button'))).toBeVisible();
    });

    it('should validate phone number format', async () => {
      // Número inválido muito curto
      await element(by.id('phone-input')).typeText('123');
      await element(by.id('send-code-button')).tap();

      await expect(
        element(by.text('Número de telefone inválido'))
      ).toBeVisible();

      // Limpar campo
      await element(by.id('phone-input')).clearText();

      // Número válido
      await element(by.id('phone-input')).typeText('11999887766');
      await expect(element(by.id('send-code-button'))).toBeVisible();
    });

    it('should handle network errors gracefully', async () => {
      // Desabilitar rede para simular erro
      await device.setURLBlacklist(['*']);

      await element(by.id('phone-input')).typeText('11999887766');
      await element(by.id('send-code-button')).tap();

      // Deve mostrar mensagem de erro de rede
      await waitFor(element(by.text('Erro de conexão')))
        .toBeVisible()
        .withTimeout(5000);

      // Reabilitar rede
      await device.setURLBlacklist([]);
    });
  });

  describe('SMS Code Verification', () => {
    beforeEach(async () => {
      // Navegar para tela de código (mock)
      await element(by.id('phone-input')).typeText('11999887766');
      await element(by.id('send-code-button')).tap();

      // Aguardar navegação
      await waitFor(element(by.id('code-input')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should show code input screen after phone submission', async () => {
      await expect(element(by.id('code-input'))).toBeVisible();
      await expect(element(by.id('verify-code-button'))).toBeVisible();
      await expect(element(by.id('resend-code-button'))).toBeVisible();
    });

    it('should validate SMS code format', async () => {
      // Código muito curto
      await element(by.id('code-input')).typeText('123');
      await element(by.id('verify-code-button')).tap();

      await expect(element(by.text('Código deve ter 6 dígitos'))).toBeVisible();

      // Código válido
      await element(by.id('code-input')).clearText();
      await element(by.id('code-input')).typeText('123456');
      await expect(element(by.id('verify-code-button'))).toBeVisible();
    });

    it('should handle code resend functionality', async () => {
      // Aguardar timer inicial
      await waitFor(element(by.id('resend-code-button')))
        .toBeVisible()
        .withTimeout(30000);

      await element(by.id('resend-code-button')).tap();

      // Deve mostrar confirmação
      await expect(element(by.text('Código reenviado'))).toBeVisible();

      // Timer deve reiniciar
      await expect(element(by.text('Reenviar em'))).toBeVisible();
    });

    it('should handle invalid code gracefully', async () => {
      await element(by.id('code-input')).typeText('000000');
      await element(by.id('verify-code-button')).tap();

      await waitFor(element(by.text('Código inválido')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Profile Setup', () => {
    beforeEach(async () => {
      // Mock navegação até profile setup
      // Isso normalmente seria feito através de um usuário test válido
      await device.launchApp({
        newInstance: true,
        permissions: { notifications: 'YES' },
      });

      // Simular login bem-sucedido navegando diretamente para ProfileSetup
      // (Em um teste real, passaríamos pelo fluxo completo)
    });

    it('should require nickname input', async () => {
      // Aguardar tela aparecer
      await waitFor(element(by.id('profile-setup-screen')))
        .toBeVisible()
        .withTimeout(10000);

      await expect(element(by.id('nickname-input'))).toBeVisible();
      await expect(element(by.id('emoji-button'))).toBeVisible();
      await expect(element(by.id('save-profile-button'))).toBeVisible();
    });

    it('should validate nickname requirements', async () => {
      await waitFor(element(by.id('profile-setup-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Tentar salvar sem nickname
      await element(by.id('save-profile-button')).tap();

      await expect(element(by.text('Escolha um apelido'))).toBeVisible();

      // Nickname muito curto
      await element(by.id('nickname-input')).typeText('a');
      await element(by.id('save-profile-button')).tap();

      await expect(
        element(by.text('Apelido deve ter pelo menos 2 caracteres'))
      ).toBeVisible();
    });

    it('should allow emoji selection', async () => {
      await waitFor(element(by.id('profile-setup-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Abrir seletor de emoji
      await element(by.id('emoji-button')).tap();

      // Aguardar modal aparecer
      await waitFor(element(by.id('emoji-picker')))
        .toBeVisible()
        .withTimeout(5000);

      // Selecionar um emoji (por exemplo, 🎉)
      await element(by.id('emoji-🎉')).tap();

      // Verificar se emoji foi selecionado
      await expect(element(by.text('🎉'))).toBeVisible();
    });

    it('should complete profile setup successfully', async () => {
      await waitFor(element(by.id('profile-setup-screen')))
        .toBeVisible()
        .withTimeout(10000);

      // Preencher dados válidos
      await element(by.id('nickname-input')).typeText('TestUser');
      await element(by.id('emoji-button')).tap();

      await waitFor(element(by.id('emoji-picker')))
        .toBeVisible()
        .withTimeout(5000);

      await element(by.id('emoji-😀')).tap();

      // Salvar perfil
      await element(by.id('save-profile-button')).tap();

      // Deve navegar para app principal
      await waitFor(element(by.id('main-app-screen')))
        .toBeVisible()
        .withTimeout(15000);
    });
  });

  describe('Authentication State Persistence', () => {
    it('should remember authenticated user after app restart', async () => {
      // Assumindo que já temos um usuário autenticado
      await device.launchApp({ newInstance: true });

      // Deve ir direto para app principal, não para login
      await waitFor(element(by.id('main-app-screen')))
        .toBeVisible()
        .withTimeout(10000);

      await expect(element(by.id('phone-input'))).not.toBeVisible();
    });

    it('should handle app backgrounding gracefully', async () => {
      await device.launchApp({ newInstance: true });

      // Colocar app em background
      await device.sendToHome();

      // Aguardar e reabrir
      await new Promise(resolve => setTimeout(resolve, 2000));
      await device.launchApp({ newInstance: false });

      // Deve manter estado
      await waitFor(element(by.id('main-app-screen')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Logout Flow', () => {
    it('should logout and return to phone input', async () => {
      await device.launchApp({ newInstance: true });

      // Navegar para perfil e fazer logout
      await element(by.id('profile-tab')).tap();
      await element(by.id('logout-button')).tap();

      // Confirmar logout
      await element(by.text('Sair')).tap();

      // Deve voltar para tela de login
      await waitFor(element(by.id('phone-input')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });
});
