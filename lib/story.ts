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

const FLOORS: Record<'en' | 'pt', Record<number, string>> = {
  en: {
    1:  `The Gloomling bursts into cold mist at your feet — the Tower's least and lowest. A door grinds open above. Somewhere far up, something laughs softly, pleased that you came.`,
    2:  `Gravewhisker scatters into the dark. Scratched on the wall by a dying hand: "TURN BACK — THE STAIRS ONLY GO ONE WAY." You climb anyway.`,
    3:  `Duskwing falls silent. The air thins and the clouds press closer, yet the summit is no nearer. The Tower, you realize, is far taller on the inside.`,
    4:  `Snare drops its stolen lantern and flees into nothing. By its light you see the truth: the walls are carved with thousands of names — and a blank space the exact shape of your own.`,
    5:  `The Gray Warg yields. Its dying eyes are almost human. "He keeps us," it breathes, "so none reach the top to free what he guards." Then it is gone.`,
    6:  `The Hollow Knight kneels, its armour empty. Inside the helm lies a scrap of banner — a hero who marched in a hundred years ago and was never seen again. Now you have met him.`,
    7:  `Gorehide falls like a tower of its own. With each general undone you feel stronger — and a little less yourself. The climb is reshaping you into something fit to climb.`,
    8:  `Stonemaw crumbles to gravel. Through the breach, a cold wind carries a voice you almost know — the same one that called your name. Nearer now. And it sounds afraid.`,
    9:  `The Weeping Wraith fades. "I knew you," it says, "before the Tower. We all did." You do not remember it. You are no longer certain you remember yourself.`,
    10: `Ignar, the Lord's gatekeeper, collapses in embers — and at last the clouds part. Above is no ceiling but another Tower, vaster and endless, its true summit unseen. The lower gate is yours. The real climb begins now.`,
  },
  pt: {
    1:  `O Gloomling desfaz-se em névoa fria aos teus pés — o mais baixo e ínfimo da Torre. Uma porta range lá em cima. Algures, bem no alto, algo ri baixinho, satisfeito por teres vindo.`,
    2:  `Gravewhisker dispersa-se na escuridão. Riscado na parede por uma mão moribunda: «VOLTA PARA TRÁS — AS ESCADAS SÓ VÃO NUM SENTIDO.» Mas tu sobes na mesma.`,
    3:  `Duskwing cala-se. O ar rareia e as nuvens aproximam-se, mas o cume não fica mais perto. A Torre, percebes, é muito mais alta por dentro.`,
    4:  `Snare larga a lanterna roubada e foge para o nada. À sua luz vês a verdade: as paredes estão gravadas com milhares de nomes — e um espaço em branco com a forma exacta do teu.`,
    5:  `O Gray Warg cede. Os seus olhos moribundos são quase humanos. «Ele guarda-nos», sussurra, «para que ninguém chegue ao topo e liberte o que ele aprisiona.» E depois desaparece.`,
    6:  `O Hollow Knight ajoelha-se, a armadura vazia. Dentro do elmo, um pedaço de estandarte — um herói que entrou há cem anos e nunca mais foi visto. Agora conheceste-o.`,
    7:  `Gorehide tomba como uma torre. A cada general derrotado sentes-te mais forte — e um pouco menos tu. A escalada está a moldar-te em algo feito para escalar.`,
    8:  `Stonemaw esfarela-se em cascalho. Pela brecha, um vento frio traz uma voz que quase reconheces — a mesma que chamou o teu nome. Mais perto agora. E parece ter medo.`,
    9:  `A Weeping Wraith desvanece-se a chorar. «Eu conhecia-te», diz, «antes da Torre. Todos conhecíamos.» Tu não te lembras dela. Já não tens a certeza de te lembrares de ti.`,
    10: `Ignar, o guardião do Senhor, tomba em brasas — e por fim as nuvens abrem-se. Acima não há tecto, mas outra Torre, vasta e infinita, o verdadeiro cume invisível. O portão inferior é teu. A verdadeira escalada começa agora.`,
  },
};

export const STORY_INTRO = INTRO[LANG];
export function floorStory(floor: number): string | undefined {
  return FLOORS[LANG][floor];
}
