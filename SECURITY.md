# Segurança

## Como reportar uma falha

**Não abra issue pública para falhas de segurança.**

Use o [relato privado de vulnerabilidades do GitHub](../../security/advisories/new): aba **Security**, botão **Report a vulnerability**. Se não conseguir, escreva para contato@zoji.app com o assunto "Segurança".

Inclua, se puder:

- o que você encontrou e onde (arquivo, tela ou endpoint);
- como reproduzir;
- qual o impacto que você imagina.

## O que esperar

- Confirmamos o recebimento em até 5 dias úteis.
- Mantemos você informado enquanto corrigimos.
- Pedimos que você não divulgue a falha até a correção ser publicada nas lojas. Combinamos juntos o momento da divulgação.
- Se você quiser, damos o crédito no registro da correção.

O Zoji é um projeto sem fins lucrativos e não tem programa de recompensa.

## Escopo

**Dentro do escopo:**

- o código deste repositório;
- o app publicado na App Store e no Google Play;
- a API em `api.zoji.app`, mesmo com o código dela fechado.

**Fora do escopo:**

- ataques de negação de serviço, spam e engenharia social;
- testes que acessem, alterem ou apaguem dados de outras pessoas;
- falhas em serviços de terceiros, que devem ser reportadas a eles.

Ao testar a API de produção, use só a sua própria conta. Para todo o resto, use o servidor falso (`npm run dev-server`).
