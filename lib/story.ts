// Narrative for ChoreQuest — a simple, fantastical climb. Bilingual (EN/PT).
import { LANG } from './i18n';

const INTRO = {
  en:
`The Tower was not built. It arrived.

One grey dawn it stood where the old forest had burned — its summit lost beyond the clouds, humming with a light the sun never gave. Warriors marched through its gate for glory and gold. None ever marched back out.

The bards whisper it belongs to the Lord of the Underworld, and that every floor is kept by one of his beasts.

You climb for none of their reasons. Something at the summit is calling your name, and it will not stop until you answer.

In the waking world, every task you finish tempers your blade within these walls. Strengthen yourself, Hero — the first gate stands open.`,
  pt:
`A Torre não foi construída. Ela chegou.

Numa madrugada cinzenta ergueu-se onde a antiga floresta ardera — o seu cume perdido para lá das nuvens, a zumbir com uma luz que o sol nunca deu. Guerreiros entraram pelo portão em busca de glória e ouro. Nenhum voltou a sair.

Os bardos sussurram que pertence ao Senhor do Submundo, e que cada andar é guardado por uma das suas feras.

Tu não sobes por nenhuma dessas razões. Algo no cume chama o teu nome, e não vai parar até que respondas.

No mundo desperto, cada tarefa que cumpres tempera a tua lâmina nestas paredes. Fortalece-te, Herói — o primeiro portão está aberto.`,
};

// One narrative beat per general — the bosses every 10th floor (10, 20, … 100).
const FLOORS: Record<'en' | 'pt', Record<number, string>> = {
  en: {
    10:  `Ignar the Gatekeeper collapses in embers. The first seal breaks, and a door grinds open above. Somewhere far up, something laughs softly — pleased that you finally came.`,
    20:  `Morok the Veiled unravels into smoke. Scratched on the wall by a dying hand: "TURN BACK — THE STAIRS ONLY GO ONE WAY." You climb anyway.`,
    30:  `Khaznuul, Maw of Ash, gutters out. The air thins, the clouds press closer, yet the summit is no nearer. The Tower, you realize, is far taller on the inside.`,
    40:  `Varkolak the Insatiable starves at last. By the light of its dying eyes you see the walls — carved with thousands of names, and a blank space the exact shape of your own.`,
    50:  `Nyx, the Hollow Queen, yields. "He keeps us," she breathes, "so none reach the top to free what he guards." Then she is gone. Halfway. No going back.`,
    60:  `Grimmaw the Devourer falls like a tower of its own. With each general undone you feel stronger — and a little less yourself. The climb is reshaping you to fit it.`,
    70:  `Sselith, Coil of Night, unwinds into the dark. A cold wind carries a voice you almost know — the same one that first called your name. Nearer now. And it sounds afraid.`,
    80:  `Brakka the Bonelord crumbles to dust. "I knew you," the bones whisper, "before the Tower. We all did." You do not remember. You are no longer certain you remember yourself.`,
    90:  `Velmoth the Soulflayer releases the souls it hoarded — and for an instant a hundred freed warriors salute you on their way out. One more general. One more gate.`,
    100: `Abaddon, Lord of the Underworld, rises to meet you — and falls. The light at the summit was never a prize. It was a door home, and the voice calling your name was your own, waiting. You step through. The Tower goes quiet at last.`,
  },
  pt: {
    10:  `Ignar, o Guardião, tomba em brasas. O primeiro selo quebra-se e uma porta range lá em cima. Algures, bem no alto, algo ri baixinho — satisfeito por finalmente teres vindo.`,
    20:  `Morok, o Velado, desfaz-se em fumo. Riscado na parede por uma mão moribunda: «VOLTA PARA TRÁS — AS ESCADAS SÓ VÃO NUM SENTIDO.» Mas tu sobes na mesma.`,
    30:  `Khaznuul, Fauce de Cinza, extingue-se. O ar rareia, as nuvens aproximam-se, mas o cume não fica mais perto. A Torre, percebes, é muito mais alta por dentro.`,
    40:  `Varkolak, o Insaciável, esfomeia-se enfim. À luz dos seus olhos moribundos vês as paredes — gravadas com milhares de nomes, e um espaço em branco com a forma exacta do teu.`,
    50:  `Nyx, a Rainha Oca, cede. «Ele guarda-nos», sussurra, «para que ninguém chegue ao topo e liberte o que ele aprisiona.» E desaparece. A meio caminho. Sem volta.`,
    60:  `Grimmaw, o Devorador, tomba como uma torre. A cada general derrotado sentes-te mais forte — e um pouco menos tu. A escalada está a moldar-te para a servir.`,
    70:  `Sselith, Anel da Noite, desenrola-se na escuridão. Um vento frio traz uma voz que quase reconheces — a mesma que chamou o teu nome. Mais perto agora. E parece ter medo.`,
    80:  `Brakka, o Senhor dos Ossos, esfarela-se em pó. «Eu conhecia-te», sussurram os ossos, «antes da Torre. Todos conhecíamos.» Tu não te lembras. Já não tens a certeza de te lembrares de ti.`,
    90:  `Velmoth, o Esfola-Almas, liberta as almas que acumulou — e por um instante cem guerreiros libertos saúdam-te ao partir. Mais um general. Mais um portão.`,
    100: `Abaddon, Senhor do Submundo, ergue-se para te enfrentar — e cai. A luz no cume nunca foi um prémio. Era uma porta para casa, e a voz que chamava o teu nome era a tua, à espera. Atravessa-la. A Torre silencia-se enfim.`,
  },
};

export const STORY_INTRO = INTRO[LANG];
export function floorStory(floor: number): string | undefined {
  return FLOORS[LANG][floor];
}
