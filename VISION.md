# Visão do Zoji

O Zoji é um mensageiro em que a conversa acontece só por emojis. Ele é simples, divertido e feito para qualquer pessoa a partir de 12 anos.

Este documento diz para onde o projeto vai. Quando uma ideia ou um PR não combina com ele, a resposta é "não", com um link para cá.

## Princípios

Valem acima de qualquer recurso novo:

1. **Só emojis.** A conversa é feita de emojis. É isso que faz o Zoji ser o Zoji.
2. **O mínimo de dados.** Coletamos só o necessário para o app funcionar: telefone, apelido, emoji de perfil e token de push.
3. **Mensagens efêmeras no servidor.** As mensagens diretas saem do servidor assim que são lidas. O histórico fica no aparelho de quem usa.
4. **A agenda não sai do aparelho.** Os números viram hash SHA-256 no próprio celular antes de qualquer comparação.
5. **Sem anúncios e sem rastreamento.** Nenhum SDK de publicidade, de análise comportamental ou de rastreamento de terceiros.
6. **Gratuito e sem fins lucrativos.**
7. **Acessível e em vários idiomas.** Hoje o app está em português, inglês e espanhol.

## O que o Zoji não vai ter

- Texto livre nas conversas.
- Anúncios ou venda de dados.
- SDKs de rastreamento ou de análise de terceiros.
- Recursos que dependam de coletar mais dados pessoais do que hoje, a não ser com um motivo muito forte, discutido antes e refletido na política de privacidade.

## Onde a ajuda é mais bem-vinda

- Correções de bugs.
- Acessibilidade (leitores de tela, contraste, tamanho de fonte).
- Traduções e novos idiomas.
- Testes automatizados.
- Desempenho e consumo de bateria.

O roadmap fica nos Projects do GitHub, dividido em "agora", "próximo" e "talvez".
