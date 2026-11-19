/**
 * Curated multilingual emoji keywords for search.
 * English is handled by the existing dataset (name + keywords fields).
 * This table adds pt-BR and es terms for the ~200 most commonly searched emojis.
 */
export const EMOJI_KEYWORDS_I18N: Record<
  string,
  { pt: string[]; es: string[]; en?: string[] }
> = {
  // ── Smileys & Emotions ────────────────────────────────────────────────────
  '😀': {
    pt: ['sorrindo', 'feliz', 'alegre', 'sorriso', 'contente'],
    es: ['sonriendo', 'feliz', 'alegre', 'sonrisa', 'contento'],
  },
  '😃': {
    pt: ['sorriso', 'feliz', 'alegre', 'animado'],
    es: ['sonrisa', 'feliz', 'alegre', 'animado'],
  },
  '😄': {
    pt: ['gargalhada', 'feliz', 'rindo', 'alegre'],
    es: ['carcajada', 'feliz', 'riendo', 'alegre'],
  },
  '😁': {
    pt: ['sorriso aberto', 'feliz', 'animado'],
    es: ['sonrisa abierta', 'feliz', 'animado'],
  },
  '😆': {
    pt: ['rindo', 'haha', 'gargalhada', 'rsrs'],
    es: ['riendo', 'haha', 'carcajada', 'jaja'],
  },
  '😅': {
    pt: ['suando', 'nervoso', 'aliviado', 'desculpa'],
    es: ['sudando', 'nervioso', 'aliviado', 'perdona'],
  },
  '🤣': {
    pt: ['rolando de rir', 'kkk', 'rsrs', 'lol', 'morri de rir'],
    es: ['muerto de risa', 'jajaja', 'lol', 'desternillado'],
  },
  '😂': {
    pt: ['chorando de rir', 'kkkk', 'rsrs', 'lol', 'haha', 'rindo muito'],
    es: ['llorando de risa', 'jajaja', 'lol', 'carcajada', 'risa'],
  },
  '🙂': {
    pt: ['sorriso leve', 'ok', 'satisfeito'],
    es: ['sonrisa leve', 'ok', 'satisfecho'],
  },
  '🙃': {
    pt: ['de cabeça pra baixo', 'irônico', 'sarcástico'],
    es: ['al revés', 'irónico', 'sarcástico'],
  },
  '😉': {
    pt: ['piscando', 'malicioso', 'brincadeira'],
    es: ['guiñando', 'pícaro', 'broma'],
  },
  '😊': {
    pt: ['feliz', 'tímido', 'corado', 'sorriso', 'contente'],
    es: ['feliz', 'tímido', 'sonrojado', 'sonrisa', 'contento'],
  },
  '😇': {
    pt: ['angelical', 'inocente', 'santinho', 'anjinho'],
    es: ['angelical', 'inocente', 'angelito', 'bueno'],
  },
  '🥰': {
    pt: ['apaixonado', 'amando', 'coração', 'amor', 'fofinho'],
    es: ['enamorado', 'amor', 'corazón', 'cariño', 'adorable'],
  },
  '😍': {
    pt: ['apaixonado', 'olhos de coração', 'amor', 'amando'],
    es: ['enamorado', 'ojos de corazón', 'amor'],
  },
  '🤩': {
    pt: ['empolgado', 'estrelado', 'maravilhado', 'uau'],
    es: ['emocionado', 'estrellado', 'maravillado', 'wow'],
  },
  '😘': {
    pt: ['beijo', 'beijo no ar', 'tchau', 'carinho'],
    es: ['beso', 'beso volado', 'adiós', 'cariño'],
  },
  '😗': { pt: ['beijo', 'beijinho'], es: ['beso', 'besito'] },
  '😚': {
    pt: ['beijo', 'corado', 'carinho'],
    es: ['beso', 'sonrojado', 'cariño'],
  },
  '😋': {
    pt: ['gostoso', 'delicioso', 'com fome', 'babando'],
    es: ['delicioso', 'sabroso', 'hambriento', 'babeando'],
  },
  '😛': {
    pt: ['língua de fora', 'brincando', 'tonto'],
    es: ['lengua afuera', 'jugando', 'tonto'],
  },
  '😜': {
    pt: ['piscando e língua', 'brincando', 'louco'],
    es: ['guiñando y lengua', 'jugando', 'loco'],
  },
  '🤪': {
    pt: ['louco', 'doido', 'tonto', 'maluco'],
    es: ['loco', 'chiflado', 'tonto', 'alocado'],
  },
  '😝': {
    pt: ['língua de fora', 'espertinho', 'provocando'],
    es: ['lengua afuera', 'burlando', 'provocando'],
  },
  '🤑': {
    pt: ['dinheiro', 'rico', 'ganancioso', 'cifrão', 'grana'],
    es: ['dinero', 'rico', 'codicioso', 'plata', 'avaro'],
  },
  '🤗': {
    pt: ['abraço', 'carinho', 'animado', 'acolhedor'],
    es: ['abrazo', 'cariño', 'animado', 'acogedor'],
  },
  '🤭': {
    pt: ['cobrindo boca', 'surpreso', 'ops', 'segredo'],
    es: ['cubriendo boca', 'sorprendido', 'ups', 'secreto'],
  },
  '🤫': {
    pt: ['silêncio', 'shhh', 'calado', 'segredo', 'psiu'],
    es: ['silencio', 'shhh', 'callado', 'secreto', 'cállate'],
  },
  '🤔': {
    pt: ['pensando', 'hmm', 'dúvida', 'reflexão', 'questionando'],
    es: ['pensando', 'hmm', 'duda', 'reflexión', 'cuestionando'],
  },
  '🤐': {
    pt: ['boca fechada', 'calado', 'segredo', 'silêncio'],
    es: ['boca cerrada', 'callado', 'secreto', 'silencio'],
  },
  '🤨': {
    pt: ['sobrancelha levantada', 'desconfiado', 'sério'],
    es: ['ceja levantada', 'desconfiado', 'serio'],
  },
  '😐': {
    pt: ['neutro', 'sem expressão', 'indiferente', 'sem graça'],
    es: ['neutral', 'sin expresión', 'indiferente'],
  },
  '😑': {
    pt: ['sem expressão', 'tedioso', 'entediado', 'indiferente'],
    es: ['sin expresión', 'tedioso', 'aburrido', 'indiferente'],
  },
  '😶': {
    pt: ['sem boca', 'silencioso', 'calado'],
    es: ['sin boca', 'silencioso', 'callado'],
  },
  '😏': {
    pt: ['irônico', 'sarcástico', 'malicioso', 'safadinho'],
    es: ['irónico', 'sarcástico', 'pícaro', 'canchero'],
  },
  '😒': {
    pt: ['desapontado', 'chateado', 'sem graça', 'aborrecido'],
    es: ['decepcionado', 'molesto', 'aburrido'],
  },
  '🙄': {
    pt: ['revirando olhos', 'entediado', 'que saco', 'ora'],
    es: ['ojos en blanco', 'aburrido', 'que rollo', 'exasperado'],
  },
  '😬': {
    pt: ['constrangido', 'desconfortável', 'tenso', 'envergonhado'],
    es: ['incómodo', 'avergonzado', 'tenso', 'mueca'],
  },
  '🤥': {
    pt: ['mentindo', 'mentiroso', 'pinóquio'],
    es: ['mintiendo', 'mentiroso', 'pinocho'],
  },
  '😌': {
    pt: ['aliviado', 'satisfeito', 'tranquilo', 'sereno'],
    es: ['aliviado', 'satisfecho', 'tranquilo', 'sereno'],
  },
  '😔': {
    pt: ['pensativo', 'triste', 'cabisbaixo', 'melancólico'],
    es: ['pensativo', 'triste', 'cabizbajo', 'melancólico'],
  },
  '😪': {
    pt: ['sonolento', 'cansado', 'com sono'],
    es: ['somnoliento', 'cansado', 'con sueño'],
  },
  '🤤': {
    pt: ['babando', 'desejando', 'gostoso'],
    es: ['babeando', 'deseando', 'sabroso'],
  },
  '😴': {
    pt: ['dormindo', 'zzz', 'sono', 'cansado', 'dorminhoco'],
    es: ['durmiendo', 'zzz', 'sueño', 'cansado', 'dormilón'],
  },
  '😷': {
    pt: ['máscara', 'doente', 'vírus', 'gripado', 'pandemia'],
    es: ['mascarilla', 'enfermo', 'virus', 'gripe', 'pandemia'],
  },
  '🤒': {
    pt: ['doente', 'gripado', 'febre', 'resfriado'],
    es: ['enfermo', 'resfriado', 'fiebre', 'catarro'],
  },
  '🤕': {
    pt: ['machucado', 'ferido', 'curativo', 'dor de cabeça'],
    es: ['lastimado', 'herido', 'vendaje', 'dolor de cabeza'],
  },
  '🤢': {
    pt: ['enjoado', 'náusea', 'mal estar', 'enjôo'],
    es: ['mareado', 'náuseas', 'malestar'],
  },
  '🤮': {
    pt: ['vomitando', 'nojo', 'asco', 'mal estar'],
    es: ['vomitando', 'asco', 'vómito', 'malestar'],
  },
  '🤧': {
    pt: ['espirrando', 'gripado', 'resfriado', 'lenço'],
    es: ['estornudando', 'resfriado', 'gripe', 'pañuelo'],
  },
  '🥵': {
    pt: ['calor', 'quente', 'suando', 'calorzão'],
    es: ['calor', 'acalorado', 'sudando', 'sofocado'],
  },
  '🥶': {
    pt: ['frio', 'gelado', 'congelando', 'friozão'],
    es: ['frío', 'congelado', 'helado', 'tiritar'],
  },
  '🥴': {
    pt: ['tonto', 'bêbado', 'torto', 'zonzo'],
    es: ['mareado', 'borracho', 'aturdido', 'tambalear'],
  },
  '😵': {
    pt: ['tonto', 'atordoado', 'girando', 'zonzo'],
    es: ['mareado', 'aturdido', 'girando', 'vértigo'],
  },
  '🤯': {
    pt: ['explodindo', 'chocado', 'inacreditável', 'nossa'],
    es: ['sorprendido', 'flipando', 'increíble', 'alucinante'],
  },
  '🤠': {
    pt: ['cowboy', 'chapéu', 'faroeste', 'caubói'],
    es: ['vaquero', 'sombrero', 'oeste', 'cowboy'],
  },
  '🥳': {
    pt: ['festa', 'aniversário', 'comemorando', 'celebrando'],
    es: ['fiesta', 'cumpleaños', 'celebrando', 'festejando'],
  },
  '😎': {
    pt: ['descolado', 'estilo', 'óculos de sol', 'legal', 'maneiro'],
    es: ['chévere', 'genial', 'gafas de sol', 'cool', 'estiloso'],
  },
  '🤓': {
    pt: ['nerd', 'geek', 'estudioso', 'inteligente'],
    es: ['nerd', 'geek', 'estudioso', 'inteligente'],
  },
  '🧐': {
    pt: ['curioso', 'investigando', 'monóculo', 'examinando'],
    es: ['curioso', 'investigando', 'monóculo', 'examinando'],
  },
  '😕': {
    pt: ['confuso', 'triste', 'desapontado'],
    es: ['confundido', 'triste', 'decepcionado'],
  },
  '😟': {
    pt: ['preocupado', 'apreensivo', 'triste'],
    es: ['preocupado', 'ansioso', 'triste'],
  },
  '🙁': {
    pt: ['triste', 'desapontado', 'chateado'],
    es: ['triste', 'decepcionado', 'apenado'],
  },
  '☹️': {
    pt: ['triste', 'infeliz', 'desapontado'],
    es: ['triste', 'infeliz', 'decepcionado'],
  },
  '😮': {
    pt: ['surpreso', 'espantado', 'boca aberta'],
    es: ['sorprendido', 'asombrado', 'boca abierta'],
  },
  '😲': {
    pt: ['surpreso', 'chocado', 'espantado'],
    es: ['sorprendido', 'chocado', 'asombrado'],
  },
  '😳': {
    pt: ['corado', 'envergonhado', 'chocado', 'surpreso'],
    es: ['sonrojado', 'avergonzado', 'sorprendido'],
  },
  '🥺': {
    pt: ['carinha de cachorro', 'rogando', 'por favor', 'implorar'],
    es: ['carita de perro', 'rogando', 'por favor', 'suplicando'],
  },
  '😦': {
    pt: ['preocupado', 'surpreso', 'angustiado'],
    es: ['preocupado', 'sorprendido', 'angustiado'],
  },
  '😧': {
    pt: ['angustiado', 'sofrendo', 'agoniado'],
    es: ['angustiado', 'sufriendo', 'agonizando'],
  },
  '😨': {
    pt: ['assustado', 'com medo', 'apavorado'],
    es: ['asustado', 'miedo', 'aterrado'],
  },
  '😰': {
    pt: ['suando frio', 'nervoso', 'ansioso'],
    es: ['sudor frío', 'nervioso', 'ansioso'],
  },
  '😥': {
    pt: ['desapontado', 'aliviado', 'triste'],
    es: ['decepcionado', 'aliviado', 'triste'],
  },
  '😢': {
    pt: ['chorando', 'triste', 'lágrima', 'choro'],
    es: ['llorando', 'triste', 'lágrima', 'llanto'],
  },
  '😭': {
    pt: ['chorando muito', 'soluçando', 'triste demais', 'choro'],
    es: ['llorando mucho', 'sollozando', 'muy triste', 'llanto'],
  },
  '😱': {
    pt: ['gritando', 'assustado', 'apavorado', 'horror'],
    es: ['gritando', 'asustado', 'aterrorizado', 'horror'],
  },
  '😖': {
    pt: ['confuso', 'frustrado', 'sofrendo'],
    es: ['confundido', 'frustrado', 'sufriendo'],
  },
  '😣': {
    pt: ['sofrendo', 'agoniado', 'persistindo'],
    es: ['sufriendo', 'angustiado', 'persistiendo'],
  },
  '😞': {
    pt: ['desapontado', 'triste', 'cabisbaixo'],
    es: ['decepcionado', 'triste', 'cabizbajo'],
  },
  '😓': {
    pt: ['suando', 'frustrado', 'trabalhando duro'],
    es: ['sudando', 'frustrado', 'trabajando duro'],
  },
  '😩': {
    pt: ['exausto', 'esgotado', 'cansado demais'],
    es: ['agotado', 'exhausto', 'cansadísimo'],
  },
  '😫': {
    pt: ['cansado', 'esgotado', 'sem energia'],
    es: ['cansado', 'agotado', 'sin energía'],
  },
  '🥱': {
    pt: ['bocejando', 'com sono', 'entediado'],
    es: ['bostezando', 'con sueño', 'aburrido'],
  },
  '😤': {
    pt: ['resfolegando', 'frustrado', 'irritado', 'bravo'],
    es: ['resoplando', 'frustrado', 'irritado', 'enojado'],
  },
  '😡': {
    pt: ['bravo', 'raiva', 'irritado', 'zangado'],
    es: ['enojado', 'rabia', 'irritado', 'molesto'],
  },
  '😠': {
    pt: ['bravo', 'zangado', 'irritado', 'raiva'],
    es: ['enojado', 'molesto', 'rabia', 'furioso'],
  },
  '🤬': {
    pt: ['xingando', 'furioso', 'palavrão', 'explodindo de raiva'],
    es: ['maldiciendo', 'furioso', 'insultos', 'fuera de sí'],
  },

  // ── Gestures ──────────────────────────────────────────────────────────────
  '👋': {
    pt: ['tchau', 'oi', 'acenando', 'olá', 'até logo'],
    es: ['adiós', 'hola', 'saludando', 'chau'],
  },
  '🤚': {
    pt: ['pare', 'stop', 'mão levantada', 'alto'],
    es: ['para', 'stop', 'mano levantada', 'alto'],
  },
  '✋': {
    pt: ['pare', 'cinco', 'stop', 'mão'],
    es: ['para', 'cinco', 'stop', 'mano'],
  },
  '🖐️': {
    pt: ['cinco dedos', 'mão aberta', 'oi'],
    es: ['cinco dedos', 'mano abierta', 'hola'],
  },
  '👌': {
    pt: ['ok', 'ótimo', 'perfeito', 'tudo certo'],
    es: ['ok', 'perfecto', 'bien', 'todo bien'],
  },
  '🤌': {
    pt: ['gesto italiano', 'perfeito', 'chef', 'ânimo'],
    es: ['gesto italiano', 'perfecto', 'chef', 'ánimo'],
  },
  '✌️': {
    pt: ['paz', 'vitória', 'v de vitória', 'dois'],
    es: ['paz', 'victoria', 'dos', 'chau'],
  },
  '🤞': {
    pt: ['dedos cruzados', 'sorte', 'tomara', 'esperando'],
    es: ['dedos cruzados', 'suerte', 'ojalá', 'esperando'],
  },
  '🤟': {
    pt: ['te amo', 'rock', 'amor', 'sinal de mão'],
    es: ['te amo', 'rock', 'amor', 'señal de mano'],
  },
  '🤘': {
    pt: ['rock', 'chifres', 'metal', 'show'],
    es: ['rock', 'cuernos', 'metal', 'show'],
  },
  '🤙': {
    pt: ['ligar', 'valeu', 'surfista', 'shaka'],
    es: ['llamar', 'genial', 'surfista', 'shaka'],
  },
  '👈': {
    pt: ['apontando esquerda', 'olha ali', 'esse'],
    es: ['apuntando izquierda', 'mira ahí', 'ese'],
  },
  '👉': {
    pt: ['apontando direita', 'esse aqui', 'vai'],
    es: ['apuntando derecha', 'ese ahí', 've'],
  },
  '👆': {
    pt: ['apontando cima', 'acima', 'número um'],
    es: ['apuntando arriba', 'arriba', 'número uno'],
  },
  '👇': {
    pt: ['apontando baixo', 'abaixo', 'olha aqui'],
    es: ['apuntando abajo', 'abajo', 'mira aquí'],
  },
  '☝️': {
    pt: ['um', 'atenção', 'espera', 'apontando'],
    es: ['uno', 'atención', 'espera', 'apuntando'],
  },
  '👍': {
    pt: ['joinha', 'legal', 'ótimo', 'bom', 'curtindo', 'aprovado'],
    es: ['pulgar arriba', 'bien', 'genial', 'aprobado', 'bueno'],
  },
  '👎': {
    pt: ['não curtiu', 'ruim', 'reprovado', 'negativo'],
    es: ['pulgar abajo', 'mal', 'reprobado', 'negativo'],
  },
  '✊': {
    pt: ['punho', 'força', 'poder', 'resistência'],
    es: ['puño', 'fuerza', 'poder', 'resistencia'],
  },
  '👊': {
    pt: ['soco', 'murro', 'bater', 'punho'],
    es: ['puñetazo', 'golpe', 'pegar', 'puño'],
  },
  '🤛': {
    pt: ['punho esquerdo', 'cumprimento', 'tchibum'],
    es: ['puño izquierdo', 'saludo', 'choque'],
  },
  '🤜': {
    pt: ['punho direito', 'cumprimento', 'tchibum'],
    es: ['puño derecho', 'saludo', 'choque'],
  },
  '🤝': {
    pt: ['aperto de mão', 'acordo', 'negócio', 'parceria'],
    es: ['apretón de manos', 'acuerdo', 'negocio', 'asociación'],
  },
  '👏': {
    pt: ['palmas', 'aplaudindo', 'parabéns', 'muito bem'],
    es: ['aplausos', 'aplaudiendo', 'felicitaciones', 'bravo'],
  },
  '🙌': {
    pt: ['celebrando', 'aleluia', 'glória', 'ovacionando'],
    es: ['celebrando', 'aleluya', 'gloria', 'ovación'],
  },
  '🙏': {
    pt: ['por favor', 'obrigado', 'rezando', 'pedindo', 'namastê'],
    es: ['por favor', 'gracias', 'orando', 'rogando', 'namaste'],
  },
  '💪': {
    pt: ['músculo', 'forte', 'força', 'malhando', 'academia'],
    es: ['músculo', 'fuerte', 'fuerza', 'gym', 'ejercicio'],
  },
  '🤲': {
    pt: ['mãos abertas', 'oferecendo', 'recebendo'],
    es: ['manos abiertas', 'ofreciendo', 'recibiendo'],
  },
  '👐': {
    pt: ['abraço aberto', 'oferecendo', 'acolhendo'],
    es: ['abrazo abierto', 'ofreciendo', 'acogiendo'],
  },
  '🫶': {
    pt: ['coração de mão', 'amor', 'carinho', 'amor próprio'],
    es: ['corazón de mano', 'amor', 'cariño', 'amor propio'],
  },
  '🖕': {
    pt: ['dedo do meio', 'grosseria', 'xingando'],
    es: ['dedo del medio', 'grosería', 'insulto'],
  },

  // ── Hearts & Love ────────────────────────────────────────────────────────
  '❤️': {
    pt: ['coração', 'amor', 'vermelho', 'te amo', 'paixão'],
    es: ['corazón', 'amor', 'rojo', 'te amo', 'pasión'],
  },
  '🧡': {
    pt: ['coração laranja', 'amor', 'carinho'],
    es: ['corazón naranja', 'amor', 'cariño'],
  },
  '💛': {
    pt: ['coração amarelo', 'amizade', 'amigo'],
    es: ['corazón amarillo', 'amistad', 'amigo'],
  },
  '💚': {
    pt: ['coração verde', 'natureza', 'saúde'],
    es: ['corazón verde', 'naturaleza', 'salud'],
  },
  '💙': {
    pt: ['coração azul', 'amizade', 'confiança'],
    es: ['corazón azul', 'amistad', 'confianza'],
  },
  '💜': {
    pt: ['coração roxo', 'místico', 'carinho'],
    es: ['corazón morado', 'místico', 'cariño'],
  },
  '🖤': {
    pt: ['coração preto', 'gótico', 'elegante'],
    es: ['corazón negro', 'gótico', 'elegante'],
  },
  '🤍': {
    pt: ['coração branco', 'puro', 'paz'],
    es: ['corazón blanco', 'puro', 'paz'],
  },
  '🤎': {
    pt: ['coração marrom', 'terra', 'natural'],
    es: ['corazón marrón', 'tierra', 'natural'],
  },
  '💔': {
    pt: ['coração partido', 'traição', 'decepção', 'término'],
    es: ['corazón roto', 'traición', 'decepción', 'ruptura'],
  },
  '❣️': {
    pt: ['ponto de exclamação coração', 'amor', 'ênfase'],
    es: ['exclamación corazón', 'amor', 'énfasis'],
  },
  '💕': {
    pt: ['corações', 'amor', 'casal', 'paixão'],
    es: ['corazones', 'amor', 'pareja', 'pasión'],
  },
  '💞': {
    pt: ['corações girando', 'amor', 'paixão'],
    es: ['corazones girando', 'amor', 'pasión'],
  },
  '💓': {
    pt: ['coração batendo', 'emocionado', 'apaixonado'],
    es: ['corazón latiendo', 'emocionado', 'enamorado'],
  },
  '💗': {
    pt: ['coração crescendo', 'amor', 'carinho'],
    es: ['corazón creciendo', 'amor', 'cariño'],
  },
  '💖': {
    pt: ['coração brilhando', 'amor', 'especial'],
    es: ['corazón brillante', 'amor', 'especial'],
  },
  '💘': {
    pt: ['coração com flecha', 'cupido', 'apaixonado'],
    es: ['corazón con flecha', 'cupido', 'enamorado'],
  },

  // ── Animals ───────────────────────────────────────────────────────────────
  '🐶': {
    pt: ['cachorro', 'cão', 'dog', 'pet', 'animal de estimação'],
    es: ['perro', 'cachorro', 'can', 'mascota'],
  },
  '🐱': {
    pt: ['gato', 'miau', 'bichano', 'pet'],
    es: ['gato', 'minino', 'miau', 'mascota'],
  },
  '🐭': {
    pt: ['rato', 'ratinho', 'camundongo'],
    es: ['ratón', 'ratita', 'ratoncito'],
  },
  '🐹': {
    pt: ['hamster', 'roedor', 'fofo'],
    es: ['hámster', 'roedor', 'tierno'],
  },
  '🐰': {
    pt: ['coelho', 'páscoa', 'bunny', 'fofo'],
    es: ['conejo', 'pascua', 'bunny', 'tierno'],
  },
  '🦊': {
    pt: ['raposa', 'fox', 'espertalhão'],
    es: ['zorro', 'fox', 'astuto'],
  },
  '🐻': {
    pt: ['urso', 'bear', 'fofo', 'pelúcia'],
    es: ['oso', 'bear', 'tierno', 'peluche'],
  },
  '🐼': {
    pt: ['panda', 'urso panda', 'china'],
    es: ['panda', 'oso panda', 'china'],
  },
  '🐨': {
    pt: ['coala', 'australia', 'fofo'],
    es: ['koala', 'australia', 'tierno'],
  },
  '🐯': {
    pt: ['tigre', 'felino', 'listrado'],
    es: ['tigre', 'felino', 'rayado'],
  },
  '🦁': {
    pt: ['leão', 'rei da selva', 'felino'],
    es: ['león', 'rey de la selva', 'felino'],
  },
  '🐮': {
    pt: ['vaca', 'moo', 'boi', 'fazenda'],
    es: ['vaca', 'moo', 'buey', 'granja'],
  },
  '🐷': {
    pt: ['porco', 'oink', 'leitão', 'suíno'],
    es: ['cerdo', 'oink', 'cochino', 'chancho'],
  },
  '🐸': {
    pt: ['sapo', 'rã', 'verde', 'perereca'],
    es: ['rana', 'sapo', 'verde', 'ranita'],
  },
  '🐵': {
    pt: ['macaco', 'primata', 'símio'],
    es: ['mono', 'primate', 'simio'],
  },
  '🐧': {
    pt: ['pinguim', 'antártica', 'preto e branco'],
    es: ['pingüino', 'antártica', 'blanco y negro'],
  },
  '🦋': {
    pt: ['borboleta', 'transformação', 'colorida'],
    es: ['mariposa', 'transformación', 'colorida'],
  },
  '🐝': {
    pt: ['abelha', 'mel', 'colmeia', 'zumbido'],
    es: ['abeja', 'miel', 'colmena', 'zumbido'],
  },
  '🦀': {
    pt: ['caranguejo', 'praia', 'marisco'],
    es: ['cangrejo', 'playa', 'marisco'],
  },
  '🐙': {
    pt: ['polvo', 'tentáculos', 'mar'],
    es: ['pulpo', 'tentáculos', 'mar'],
  },
  '🦈': {
    pt: ['tubarão', 'mar', 'predador', 'medo'],
    es: ['tiburón', 'mar', 'depredador', 'miedo'],
  },
  '🐬': {
    pt: ['golfinho', 'mar', 'aquático'],
    es: ['delfín', 'mar', 'acuático'],
  },
  '🐳': { pt: ['baleia', 'mar', 'enorme'], es: ['ballena', 'mar', 'enorme'] },
  '🦅': {
    pt: ['águia', 'ave', 'liberdade', 'voo'],
    es: ['águila', 'ave', 'libertad', 'vuelo'],
  },
  '🦆': { pt: ['pato', 'quack', 'lagoa'], es: ['pato', 'quack', 'laguna'] },
  '🐍': {
    pt: ['cobra', 'serpente', 'venenosa', 'réptil'],
    es: ['serpiente', 'culebra', 'venenosa', 'reptil'],
  },

  // ── Food & Drink ─────────────────────────────────────────────────────────
  '🍎': {
    pt: ['maçã', 'fruta', 'vermelho', 'saudável'],
    es: ['manzana', 'fruta', 'roja', 'saludable'],
  },
  '🍊': {
    pt: ['laranja', 'tangerina', 'cítrico', 'fruta'],
    es: ['naranja', 'mandarina', 'cítrico', 'fruta'],
  },
  '🍋': {
    pt: ['limão', 'azedo', 'cítrico', 'amarelo'],
    es: ['limón', 'ácido', 'cítrico', 'amarillo'],
  },
  '🍇': {
    pt: ['uva', 'vinho', 'roxo', 'fruta'],
    es: ['uva', 'vino', 'morado', 'fruta'],
  },
  '🍓': {
    pt: ['morango', 'vermelho', 'doce', 'fruta'],
    es: ['fresa', 'frutilla', 'roja', 'dulce'],
  },
  '🫐': {
    pt: ['mirtilo', 'blueberry', 'azul', 'fruta'],
    es: ['arándano', 'blueberry', 'azul', 'fruta'],
  },
  '🍒': {
    pt: ['cereja', 'vermelha', 'doce', 'fruta'],
    es: ['cereza', 'roja', 'dulce', 'fruta'],
  },
  '🍑': {
    pt: ['pêssego', 'bunda', 'fruta'],
    es: ['durazno', 'melocotón', 'trasero', 'fruta'],
  },
  '🥑': {
    pt: ['abacate', 'verde', 'saudável', 'gordura boa'],
    es: ['aguacate', 'palta', 'verde', 'saludable'],
  },
  '🍕': {
    pt: ['pizza', 'italiana', 'queijo', 'lanche'],
    es: ['pizza', 'italiana', 'queso', 'merienda'],
  },
  '🍔': {
    pt: ['hambúrguer', 'burger', 'lanche', 'fast food'],
    es: ['hamburguesa', 'burger', 'comida rápida'],
  },
  '🍟': {
    pt: ['batata frita', 'fritas', 'fast food', 'salgado'],
    es: ['papas fritas', 'patatas fritas', 'comida rápida'],
  },
  '🌮': {
    pt: ['taco', 'mexicano', 'tortilha'],
    es: ['taco', 'mexicano', 'tortilla'],
  },
  '🌯': {
    pt: ['wrap', 'enrolado', 'sanduíche'],
    es: ['wrap', 'enrollado', 'sándwich'],
  },
  '🍜': {
    pt: ['macarrão', 'ramen', 'noodle', 'sopa'],
    es: ['fideos', 'ramen', 'noodles', 'sopa'],
  },
  '🍣': {
    pt: ['sushi', 'japonês', 'peixe', 'salmão'],
    es: ['sushi', 'japonés', 'pescado', 'salmón'],
  },
  '🍺': {
    pt: ['cerveja', 'beer', 'gelada', 'bebida'],
    es: ['cerveza', 'beer', 'bebida', 'fría'],
  },
  '🍷': {
    pt: ['vinho', 'taça', 'uva', 'bebida'],
    es: ['vino', 'copa', 'uva', 'bebida'],
  },
  '🥂': {
    pt: ['brinde', 'celebração', 'taças', 'parabéns'],
    es: ['brindis', 'celebración', 'copas', 'felicitaciones'],
  },
  '☕': {
    pt: ['café', 'cafezinho', 'quente', 'caneca'],
    es: ['café', 'cafecito', 'caliente', 'taza'],
  },
  '🍵': {
    pt: ['chá', 'xícara', 'quente', 'infusão'],
    es: ['té', 'taza', 'caliente', 'infusión'],
  },
  '🧋': {
    pt: ['bubble tea', 'chá com bolinha', 'tapioca'],
    es: ['bubble tea', 'té con perlas', 'tapioca'],
  },
  '🎂': {
    pt: ['bolo de aniversário', 'festa', 'parabéns', 'celebração'],
    es: ['pastel de cumpleaños', 'torta', 'fiesta', 'felicitaciones'],
  },
  '🍰': {
    pt: ['fatia de bolo', 'sobremesa', 'doce'],
    es: ['trozo de pastel', 'postre', 'dulce'],
  },
  '🧁': {
    pt: ['cupcake', 'bolinho', 'sobremesa', 'doce'],
    es: ['cupcake', 'panquecito', 'postre', 'dulce'],
  },
  '🍫': {
    pt: ['chocolate', 'doce', 'cacau', 'guloseima'],
    es: ['chocolate', 'dulce', 'cacao', 'golosina'],
  },
  '🍭': {
    pt: ['pirulito', 'doce', 'guloseima', 'açúcar'],
    es: ['piruleta', 'paleta', 'dulce', 'golosina'],
  },
  '🍦': {
    pt: ['sorvete', 'casquinha', 'gelato', 'verão'],
    es: ['helado', 'cucurucho', 'gelato', 'verano'],
  },
  '🍩': {
    pt: ['donut', 'rosquinha', 'sobremesa'],
    es: ['dona', 'donut', 'rosquilla', 'postre'],
  },
  '🍪': {
    pt: ['biscoito', 'bolacha', 'cookie', 'doce'],
    es: ['galleta', 'cookie', 'dulce'],
  },
  '🌶️': {
    pt: ['pimenta', 'apimentado', 'picante', 'ardido'],
    es: ['chile', 'ají', 'picante', 'ardiente'],
  },
  '🧃': {
    pt: ['suco', 'caixinha', 'bebida', 'fruta'],
    es: ['jugo', 'zumo', 'bebida', 'cajita'],
  },
  '🥤': {
    pt: ['refrigerante', 'copo', 'bebida gelada', 'canudo'],
    es: ['refresco', 'vaso', 'bebida fría', 'sorbete'],
  },

  // ── Nature & Weather ─────────────────────────────────────────────────────
  '🌸': {
    pt: ['flor de cerejeira', 'primavera', 'delicada', 'rosa'],
    es: ['flor de cerezo', 'primavera', 'delicada', 'rosa'],
  },
  '🌺': {
    pt: ['flor', 'hibisco', 'tropical', 'colorida'],
    es: ['flor', 'hibisco', 'tropical', 'colorida'],
  },
  '🌻': {
    pt: ['girassol', 'amarelo', 'feliz', 'verão'],
    es: ['girasol', 'amarillo', 'alegre', 'verano'],
  },
  '🌹': {
    pt: ['rosa', 'flor', 'romance', 'amor', 'vermelha'],
    es: ['rosa', 'flor', 'romance', 'amor', 'roja'],
  },
  '🌷': {
    pt: ['tulipa', 'flor', 'primavera', 'colorida'],
    es: ['tulipán', 'flor', 'primavera', 'colorida'],
  },
  '🌊': {
    pt: ['onda', 'mar', 'oceano', 'praia', 'surf'],
    es: ['ola', 'mar', 'océano', 'playa', 'surf'],
  },
  '🌈': {
    pt: ['arco-íris', 'cores', 'chuva', 'diversidade'],
    es: ['arcoíris', 'colores', 'lluvia', 'diversidad'],
  },
  '⭐': {
    pt: ['estrela', 'favorito', 'nota', 'destaque'],
    es: ['estrella', 'favorito', 'calificación', 'destacado'],
  },
  '🌟': {
    pt: ['estrela brilhante', 'especial', 'destaque', 'incrível'],
    es: ['estrella brillante', 'especial', 'destacado', 'increíble'],
  },
  '✨': {
    pt: ['brilhando', 'estrelinha', 'magia', 'especial'],
    es: ['brillando', 'estrellita', 'magia', 'especial'],
  },
  '🌙': {
    pt: ['lua', 'noite', 'escuro', 'crescente'],
    es: ['luna', 'noche', 'oscuro', 'creciente'],
  },
  '☀️': {
    pt: ['sol', 'verão', 'calor', 'ensolarado', 'dia'],
    es: ['sol', 'verano', 'calor', 'soleado', 'día'],
  },
  '⛅': {
    pt: ['nublado', 'parcialmente nublado', 'nuvem'],
    es: ['nublado', 'parcialmente nublado', 'nube'],
  },
  '🌧️': {
    pt: ['chuva', 'chuvoso', 'chovendo', 'aguaceiro'],
    es: ['lluvia', 'lluvioso', 'lloviendo', 'aguacero'],
  },
  '⛈️': {
    pt: ['tempestade', 'trovão', 'raio', 'temporal'],
    es: ['tormenta', 'trueno', 'rayo', 'temporal'],
  },
  '❄️': {
    pt: ['neve', 'frio', 'gelado', 'inverno', 'floco'],
    es: ['nieve', 'frío', 'helado', 'invierno', 'copo'],
  },
  '🔥': {
    pt: ['fogo', 'quente', 'incrível', 'pegando fogo', 'trending', 'fogueira'],
    es: ['fuego', 'caliente', 'increíble', 'ardiendo', 'tendencia', 'fogata'],
  },
  '💧': {
    pt: ['água', 'gota', 'chuva', 'líquido'],
    es: ['agua', 'gota', 'lluvia', 'líquido'],
  },
  '🌴': {
    pt: ['palmeira', 'praia', 'tropical', 'verão'],
    es: ['palmera', 'playa', 'tropical', 'verano'],
  },
  '🌵': {
    pt: ['cacto', 'deserto', 'seco', 'espinho'],
    es: ['cactus', 'desierto', 'seco', 'espinas'],
  },
  '🍀': {
    pt: ['trevo', 'sorte', 'verde', 'quatro folhas'],
    es: ['trébol', 'suerte', 'verde', 'cuatro hojas'],
  },
  '🌿': {
    pt: ['erva', 'folha', 'natureza', 'verde', 'planta'],
    es: ['hierba', 'hoja', 'naturaleza', 'verde', 'planta'],
  },
  '🍂': {
    pt: ['folha caindo', 'outono', 'marrom', 'sazonal'],
    es: ['hoja caída', 'otoño', 'marrón', 'estacional'],
  },

  // ── Activities & Objects ─────────────────────────────────────────────────
  '🎉': {
    pt: ['festa', 'parabéns', 'comemoração', 'confete', 'celebração'],
    es: ['fiesta', 'felicitaciones', 'celebración', 'confeti'],
  },
  '🎊': {
    pt: ['confete', 'festa', 'celebração', 'comemoração'],
    es: ['confeti', 'fiesta', 'celebración'],
  },
  '🎈': {
    pt: ['balão', 'festa', 'aniversário', 'colorido'],
    es: ['globo', 'fiesta', 'cumpleaños', 'colorido'],
  },
  '🎁': {
    pt: ['presente', 'gift', 'brinde', 'surpresa', 'embrulho'],
    es: ['regalo', 'gift', 'sorpresa', 'obsequio'],
  },
  '🏆': {
    pt: ['troféu', 'campeão', 'vencedor', 'primeiro lugar'],
    es: ['trofeo', 'campeón', 'ganador', 'primer lugar'],
  },
  '🥇': {
    pt: ['medalha de ouro', 'primeiro', 'campeão', 'vencedor'],
    es: ['medalla de oro', 'primero', 'campeón', 'ganador'],
  },
  '⚽': {
    pt: ['futebol', 'bola', 'jogo', 'esporte'],
    es: ['fútbol', 'balón', 'juego', 'deporte'],
  },
  '🏀': {
    pt: ['basquete', 'basquetebol', 'bola', 'esporte'],
    es: ['baloncesto', 'básquet', 'pelota', 'deporte'],
  },
  '🎮': {
    pt: ['videogame', 'jogo', 'controle', 'games', 'gamer'],
    es: ['videojuego', 'juego', 'control', 'games', 'gamer'],
  },
  '🎯': {
    pt: ['alvo', 'objetivo', 'meta', 'foco', 'acertou'],
    es: ['diana', 'objetivo', 'meta', 'foco', 'acertó'],
  },
  '🎵': {
    pt: ['música', 'nota musical', 'som', 'melodia'],
    es: ['música', 'nota musical', 'sonido', 'melodía'],
  },
  '🎶': {
    pt: ['músicas', 'notas musicais', 'melodia', 'cantando'],
    es: ['músicas', 'notas musicales', 'melodía', 'cantando'],
  },
  '🎤': {
    pt: ['microfone', 'cantando', 'karaokê', 'show'],
    es: ['micrófono', 'cantando', 'karaoke', 'show'],
  },
  '🎧': {
    pt: ['fone de ouvido', 'ouvindo música', 'headphone'],
    es: ['auriculares', 'escuchando música', 'headphones'],
  },
  '📱': {
    pt: ['celular', 'smartphone', 'telefone', 'ligação'],
    es: ['celular', 'smartphone', 'teléfono', 'llamada'],
  },
  '💻': {
    pt: ['notebook', 'laptop', 'computador', 'trabalho'],
    es: ['laptop', 'portátil', 'computadora', 'trabajo'],
  },
  '📸': {
    pt: ['foto', 'câmera', 'fotografia', 'tirar foto'],
    es: ['foto', 'cámara', 'fotografía', 'tomar foto'],
  },
  '📚': {
    pt: ['livros', 'estudando', 'lendo', 'escola', 'aprendendo'],
    es: ['libros', 'estudiando', 'leyendo', 'escuela', 'aprendiendo'],
  },
  '💰': {
    pt: ['dinheiro', 'grana', 'bufunfa', 'rico', 'moeda'],
    es: ['dinero', 'plata', 'lana', 'rico', 'moneda'],
  },
  '💎': {
    pt: ['diamante', 'joia', 'precioso', 'luxo'],
    es: ['diamante', 'joya', 'precioso', 'lujo'],
  },
  '👑': {
    pt: ['coroa', 'rei', 'rainha', 'realeza', 'melhor'],
    es: ['corona', 'rey', 'reina', 'realeza', 'mejor'],
  },
  '🔑': {
    pt: ['chave', 'acesso', 'abrir', 'senha'],
    es: ['llave', 'acceso', 'abrir', 'contraseña'],
  },
  '💡': {
    pt: ['ideia', 'lâmpada', 'luz', 'pensamento', 'inspiração'],
    es: ['idea', 'bombilla', 'luz', 'pensamiento', 'inspiración'],
  },
  '⌚': {
    pt: ['relógio', 'hora', 'tempo', 'pontualidade'],
    es: ['reloj', 'hora', 'tiempo', 'puntualidad'],
  },
  '🏠': {
    pt: ['casa', 'lar', 'home', 'moradia', 'residência'],
    es: ['casa', 'hogar', 'home', 'vivienda'],
  },
  '🚗': {
    pt: ['carro', 'automóvel', 'veículo', 'dirigir'],
    es: ['carro', 'auto', 'coche', 'automóvil', 'manejar'],
  },
  '✈️': {
    pt: ['avião', 'viagem', 'voo', 'viajando', 'turismo'],
    es: ['avión', 'viaje', 'vuelo', 'viajando', 'turismo'],
  },
  '🚀': {
    pt: ['foguete', 'lançamento', 'espaço', 'rápido', 'decolando'],
    es: ['cohete', 'lanzamiento', 'espacio', 'rápido', 'despegando'],
  },
  '🌍': {
    pt: ['mundo', 'terra', 'planeta', 'global'],
    es: ['mundo', 'tierra', 'planeta', 'global'],
  },
  '📍': {
    pt: ['localização', 'pino', 'aqui', 'marcador'],
    es: ['ubicación', 'pin', 'aquí', 'marcador'],
  },
  '🎓': {
    pt: ['formatura', 'diploma', 'graduação', 'faculdade', 'escola'],
    es: ['graduación', 'diploma', 'título', 'universidad', 'colegio'],
  },
  '💊': {
    pt: ['remédio', 'pílula', 'comprimido', 'medicamento'],
    es: ['medicamento', 'pastilla', 'píldora', 'remedio'],
  },
  '🩺': {
    pt: ['médico', 'estetoscópio', 'saúde', 'doutor'],
    es: ['médico', 'estetoscopio', 'salud', 'doctor'],
  },
  '⚡': {
    pt: ['raio', 'elétrico', 'rápido', 'energia', 'potência'],
    es: ['rayo', 'eléctrico', 'rápido', 'energía', 'potencia'],
  },
  '💤': {
    pt: ['dormindo', 'zzz', 'sono', 'cochilo'],
    es: ['durmiendo', 'zzz', 'sueño', 'siesta'],
  },
  '🎸': {
    pt: ['guitarra', 'rock', 'música', 'instrumento'],
    es: ['guitarra', 'rock', 'música', 'instrumento'],
  },
  '🧠': {
    pt: ['cérebro', 'inteligência', 'pensar', 'mente'],
    es: ['cerebro', 'inteligencia', 'pensar', 'mente'],
  },
  '👀': {
    pt: ['olhos', 'olhando', 'espionando', 'curioso'],
    es: ['ojos', 'mirando', 'espiando', 'curioso'],
  },
  '💯': {
    pt: ['cem por cento', 'perfeito', 'nota máxima', 'excelente'],
    es: ['cien por ciento', 'perfecto', 'nota máxima', 'excelente'],
  },
  '🆗': {
    pt: ['ok', 'certo', 'aprovado', 'confirmado'],
    es: ['ok', 'correcto', 'aprobado', 'confirmado'],
  },
  '❗': {
    pt: ['atenção', 'importante', 'alerta', 'urgente'],
    es: ['atención', 'importante', 'alerta', 'urgente'],
  },
  '❓': {
    pt: ['dúvida', 'pergunta', 'questionando', 'não sei'],
    es: ['duda', 'pregunta', 'cuestionando', 'no sé'],
  },
  '🚫': {
    pt: ['proibido', 'não', 'bloqueado', 'impedido'],
    es: ['prohibido', 'no', 'bloqueado', 'impedido'],
  },
  '✅': {
    pt: ['confirmado', 'certo', 'correto', 'feito', 'ok'],
    es: ['confirmado', 'correcto', 'hecho', 'ok'],
  },
  '⚠️': {
    pt: ['atenção', 'cuidado', 'aviso', 'alerta'],
    es: ['atención', 'cuidado', 'aviso', 'alerta'],
  },
};
