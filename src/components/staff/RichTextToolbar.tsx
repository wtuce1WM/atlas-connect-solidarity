import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Link as LinkIcon, Heading2, Heading3, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Strikethrough, Highlighter, Superscript, Subscript,
  Quote, Minus, ImagePlus, TableIcon, Youtube, Palette,
  Plus, Trash2, ArrowDown, ArrowRight, Smile, Search,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface RichTextToolbarProps {
  editor: Editor;
  simple?: boolean;
}

const COLORS = [
  "#000000", "#e03131", "#2f9e44", "#1971c2", "#f08c00",
  "#9c36b5", "#0c8599", "#e8590c", "#d6336c", "#495057",
];

const ToolbarButton = ({
  active, onClick, disabled, children, title,
}: {
  active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode; title?: string;
}) => (
  <Button
    type="button"
    variant={active ? "secondary" : "ghost"}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="h-8 w-8 p-0"
    title={title}
  >
    {children}
  </Button>
);

const Sep = () => <div className="w-px h-8 bg-border mx-1" />;

interface EmojiItem {
  type: "unicode";
  value: string;
}
interface ImageEmojiItem {
  type: "image";
  src: string;
  alt: string;
}
type AnyEmoji = EmojiItem | ImageEmojiItem;

const CUSTOM_IMAGE_EMOJIS: ImageEmojiItem[] = [
  { type: "image", src: "/emojis/tajine-khlia.webp", alt: "Tajine khlia" },
  { type: "image", src: "/emojis/tajine-marocain.webp", alt: "Tajine marocain" },
  { type: "image", src: "/emojis/tajine-blanc.webp", alt: "Tajine blanc" },
  { type: "image", src: "/emojis/tajine-decoratif.webp", alt: "Tajine décoratif" },
  { type: "image", src: "/emojis/couscous-legumes.webp", alt: "Couscous légumes" },
  { type: "image", src: "/emojis/couscous-poulet.webp", alt: "Couscous poulet" },
  { type: "image", src: "/emojis/theiere-or.webp", alt: "Théière marocaine" },
  { type: "image", src: "/emojis/the-maroc.webp", alt: "Thé marocain" },
  { type: "image", src: "/emojis/monument-maroc.webp", alt: "Monument marocain" },
  { type: "image", src: "/emojis/hassan-ii.webp", alt: "Mosquée Hassan II" },
];

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: "Smileys", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😋","😛","🤗","🤔","😐","😑","😶","🙄","😏","😌","😴","🤤","😷","🤒","🤕","🤢","🤮","🥵","🥶","😵","🤯","🤠","🥳","😎","🤓","🧐"] },
  { label: "Gestes", emojis: ["👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤝","🙏","✍️","💪","🦾","🖕","👏","🫶","❤️‍🔥"] },
  { label: "Objets", emojis: ["⭐","🌟","✨","💫","🔥","💯","❤️","🧡","💛","💚","💙","💜","🖤","🤍","💔","💕","💖","💗","💘","💝","🏆","🎯","🎪","🎨","🎬","🎭","🎶","🎵","📌","📍","🔗","💡","🔔","📢","📣","💰","💵","💎","🎁","🎉","🎊"] },
  { label: "Nourriture", emojis: ["🍽️","🍴","🥄","🔪","☕","🍵","🥤","🍷","🍸","🍹","🍺","🥂","🧃","🍕","🍔","🍟","🌭","🥪","🌮","🌯","🥗","🍝","🍜","🍣","🍱","🥘","🧆","🥙","🍰","🎂","🍫","🍩","🍪","🧁","🍦","🍓","🍒","🍑","🥑","🫒","🌶️","🧀"] },
  { label: "Voyages", emojis: ["✈️","🛩️","🚀","🛸","🚁","⛵","🛥️","🚢","🚗","🚕","🚌","🏨","🏠","🏡","🏢","🏛️","⛪","🕌","🕍","🗼","🗽","🏰","🌍","🌎","🌏","🗺️","🧭","⛰️","🏔️","🌋","🏖️","🏝️","🌅","🌄","🌇","🌆","🌃","🌉","♨️","🎡","🎢","🎠"] },
  { label: "Nature", emojis: ["🌸","🌺","🌻","🌹","🌷","🌼","🌿","🍀","🍁","🍂","🍃","🌳","🌴","🌵","🎋","🎍","🌾","☀️","🌤️","⛅","🌥️","🌦️","🌧️","⛈️","🌩️","🌈","🌊","💧","❄️","☃️","🐾","🦋","🐝","🐞","🌙","⭐","🌠"] },
  { label: "Symboles", emojis: ["✅","❌","⚠️","🚫","♻️","💲","©️","®️","™️","➡️","⬅️","⬆️","⬇️","↗️","↘️","↙️","↖️","↕️","↔️","🔄","🔃","➕","➖","✖️","➗","💠","🔶","🔷","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔲","🔳","▪️","▫️"] },
  { label: "Animaux", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦅","🦆","🦉","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐙","🦑","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦏","🐪","🐫","🦒","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦌","🐕","🐈","🦃","🕊️","🐇","🦔","🦇","🐓","🦜","🦩","🦚","🐺","🐿️"] },
  { label: "Sport", emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🥍","🏑","🥅","⛳","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🏋️","🤸","🤾","🏊","🚴","🧗","🤺","🏇","🏌️","🏄","🚣","🧘","🏆","🥇","🥈","🥉","🏅","🎖️","🎗️"] },
  { label: "Météo", emojis: ["☀️","🌤️","⛅","🌥️","🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄","🌬️","💨","🌪️","🌫️","🌈","☁️","🌡️","🔥","💧","🌊","☔","⚡","🌙","🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘","🌚","🌝","🌞","⭐","🌟","💫","✨","☄️","🌠","🌌"] },
  { label: "Drapeaux", emojis: ["🇲🇦","🇫🇷","🇬🇧","🇺🇸","🇪🇸","🇮🇹","🇩🇪","🇵🇹","🇧🇪","🇨🇭","🇳🇱","🇸🇦","🇦🇪","🇶🇦","🇰🇼","🇧🇭","🇴🇲","🇯🇴","🇪🇬","🇹🇳","🇩🇿","🇱🇾","🇹🇷","🇬🇷","🇯🇵","🇨🇳","🇰🇷","🇮🇳","🇧🇷","🇲🇽","🇦🇷","🇨🇦","🇦🇺","🇷🇺","🇵🇱","🇸🇪","🇳🇴","🇩🇰","🇫🇮","🇦🇹","🇮🇪","🇨🇿","🇭🇺","🇷🇴","🇭🇷","🇺🇦","🏳️","🏴","🏁","🚩"] },
];

const IMAGE_EMOJI_KEYWORDS: Record<string, string[]> = {
  "/emojis/tajine-khlia.webp": ["tajine","khlia","maroc","marocain","plat"],
  "/emojis/tajine-marocain.webp": ["tajine","marocain","maroc","plat"],
  "/emojis/tajine-blanc.webp": ["tajine","blanc","maroc","céramique"],
  "/emojis/tajine-decoratif.webp": ["tajine","décoratif","maroc","artisanat"],
  "/emojis/couscous-legumes.webp": ["couscous","légumes","maroc","plat"],
  "/emojis/couscous-poulet.webp": ["couscous","poulet","maroc","plat"],
  "/emojis/theiere-or.webp": ["thé","théière","maroc","or","menthe"],
  "/emojis/the-maroc.webp": ["thé","maroc","menthe","plateau"],
  "/emojis/monument-maroc.webp": ["monument","maroc","mosquée","architecture"],
  "/emojis/hassan-ii.webp": ["hassan","mosquée","casablanca","maroc","monument"],
};

const EMOJI_KEYWORDS: Record<string, string[]> = {
  "😀":["smile","sourire","happy","heureux"],"😃":["grin","sourire"],"😄":["laugh","rire"],"😁":["beam","sourire"],"😆":["squint","rire"],"😅":["sweat","sueur"],"🤣":["rofl","mdr"],"😂":["joy","joie","rire"],"🙂":["slight smile","sourire"],"😊":["blush","rougir"],"😇":["angel","ange"],"🥰":["love","amour","coeur"],"😍":["heart eyes","yeux coeur"],"🤩":["star","étoile"],"😘":["kiss","bisou"],"😋":["yum","miam"],"😛":["tongue","langue"],"🤗":["hug","câlin"],"🤔":["think","penser","réfléchir"],"😐":["neutral","neutre"],"😑":["expressionless"],"😶":["mute","muet"],"🙄":["eye roll","yeux"],"😏":["smirk"],"😌":["relieved","soulagé"],"😴":["sleep","dormir","sommeil"],"🤤":["drool","baver"],"😷":["mask","masque"],"🤒":["sick","malade"],"🤕":["hurt","blessé"],"🤢":["nausea","nausée"],"🤮":["vomit","vomir"],"🥵":["hot","chaud"],"🥶":["cold","froid"],"😵":["dizzy","étourdi"],"🤯":["mind blown","explosé"],"🤠":["cowboy"],"🥳":["party","fête"],"😎":["cool","lunettes"],"🤓":["nerd","geek"],"🧐":["monocle"],
  "👍":["thumbs up","pouce","ok","bien"],"👎":["thumbs down","pouce bas"],"👌":["ok","parfait"],"✌️":["peace","paix","victoire"],"🤞":["crossed","croisé","chance"],"🤟":["love you","rock"],"🤘":["rock","metal"],"🤙":["call","appel"],"👈":["left","gauche"],"👉":["right","droite"],"👆":["up","haut"],"👇":["down","bas"],"☝️":["point","index"],"✋":["hand","main","stop"],"🤚":["raised hand","main"],"🖐️":["fingers","doigts"],"🖖":["vulcan","spock"],"👋":["wave","salut","coucou"],"🤝":["handshake","poignée"],"🙏":["pray","prier","merci"],"✍️":["write","écrire"],"💪":["muscle","force","biceps"],"🦾":["prosthetic","robot"],"👏":["clap","applaudir","bravo"],"🫶":["heart hands","coeur mains"],"❤️‍🔥":["fire heart","coeur feu"],
  "⭐":["star","étoile"],"🌟":["glow","brillant"],"✨":["sparkle","étincelle","paillette"],"💫":["dizzy","étoile"],"🔥":["fire","feu","hot"],"💯":["100","perfect","parfait"],"❤️":["heart","coeur","amour"],"🧡":["orange heart","coeur"],"💛":["yellow heart","coeur"],"💚":["green heart","coeur"],"💙":["blue heart","coeur"],"💜":["purple heart","coeur"],"🖤":["black heart","coeur noir"],"🤍":["white heart","coeur blanc"],"💔":["broken heart","coeur brisé"],"🏆":["trophy","trophée","victoire"],"🎯":["target","cible"],"🎨":["art","peinture","palette"],"🎬":["cinema","film","clap"],"🎭":["theater","théâtre","masque"],"🎶":["music","musique","note"],"🎵":["note","musique"],"📌":["pin","épingle"],"📍":["location","localisation","lieu"],"🔗":["link","lien"],"💡":["idea","idée","ampoule"],"🔔":["bell","cloche","notification"],"📢":["speaker","haut-parleur"],"💰":["money","argent","sac"],"💵":["dollar","billet"],"💎":["gem","diamant","bijou"],"🎁":["gift","cadeau"],"🎉":["party","fête","tada"],"🎊":["confetti","fête"],
  "🍽️":["plate","assiette","restaurant"],"☕":["coffee","café"],"🍵":["tea","thé"],"🍷":["wine","vin"],"🍸":["cocktail","martini"],"🍹":["tropical drink","cocktail"],"🍺":["beer","bière"],"🥂":["champagne","toast","cheers","santé"],"🍕":["pizza"],"🍔":["burger","hamburger"],"🍟":["fries","frites"],"🥪":["sandwich"],"🌮":["taco"],"🥗":["salad","salade"],"🍝":["pasta","pâtes","spaghetti"],"🍣":["sushi"],"🍱":["bento"],"🥘":["tagine","tajine","plat"],"🍰":["cake","gâteau"],"🎂":["birthday","anniversaire","gâteau"],"🍫":["chocolate","chocolat"],"🍩":["donut"],"🍪":["cookie","biscuit"],"🍦":["ice cream","glace"],"🍓":["strawberry","fraise"],"🧀":["cheese","fromage"],
  "✈️":["plane","avion","vol"],"🚀":["rocket","fusée"],"🚁":["helicopter","hélicoptère"],"⛵":["boat","bateau","voilier"],"🚢":["ship","navire","bateau"],"🚗":["car","voiture"],"🚕":["taxi"],"🏨":["hotel","hôtel"],"🏠":["house","maison"],"🏢":["building","immeuble","bureau"],"🏛️":["museum","musée","monument"],"⛪":["church","église"],"🕌":["mosque","mosquée"],"🗼":["tower","tour"],"🏰":["castle","château"],"🌍":["world","monde","terre","globe"],"🗺️":["map","carte"],"🧭":["compass","boussole"],"⛰️":["mountain","montagne"],"🏔️":["snow mountain","montagne neige"],"🌋":["volcano","volcan"],"🏖️":["beach","plage"],"🏝️":["island","île"],"🌅":["sunrise","lever soleil"],"🌇":["sunset","coucher soleil"],
  "🌸":["cherry blossom","cerisier","fleur"],"🌺":["hibiscus","fleur"],"🌻":["sunflower","tournesol"],"🌹":["rose"],"🌷":["tulip","tulipe"],"🌼":["blossom","fleur"],"🌿":["herb","herbe","plante"],"🍀":["clover","trèfle","chance"],"🌳":["tree","arbre"],"🌴":["palm","palmier"],"🌵":["cactus"],"🌾":["rice","blé","céréale"],"🌈":["rainbow","arc-en-ciel"],"🌊":["wave","vague","mer","ocean"],"💧":["water","eau","goutte"],"❄️":["snow","neige","flocon"],"🌙":["moon","lune","nuit"],
  "✅":["check","validé","oui"],"❌":["cross","non","faux"],"⚠️":["warning","attention","danger"],"🚫":["prohibited","interdit"],"♻️":["recycle","recyclage"],"➡️":["right arrow","flèche droite"],"⬅️":["left arrow","flèche gauche"],"⬆️":["up arrow","flèche haut"],"⬇️":["down arrow","flèche bas"],
  "🐶":["dog","chien"],"🐱":["cat","chat"],"🐰":["rabbit","lapin"],"🦊":["fox","renard"],"🐻":["bear","ours"],"🐼":["panda"],"🐨":["koala"],"🐯":["tiger","tigre"],"🦁":["lion"],"🐮":["cow","vache"],"🐷":["pig","cochon"],"🐸":["frog","grenouille"],"🐵":["monkey","singe"],"🐔":["chicken","poulet","poule"],"🐧":["penguin","pingouin"],"🦅":["eagle","aigle"],"🦉":["owl","hibou","chouette"],"🐴":["horse","cheval"],"🦄":["unicorn","licorne"],"🐬":["dolphin","dauphin"],"🐳":["whale","baleine"],"🦈":["shark","requin"],"🐘":["elephant","éléphant"],"🦒":["giraffe","girafe"],"🐪":["camel","chameau","dromadaire"],"🐫":["camel","chameau"],"🕊️":["dove","colombe","paix"],"🐺":["wolf","loup"],
  "⚽":["soccer","football","foot"],"🏀":["basketball","basket"],"🎾":["tennis"],"🏐":["volleyball","volley"],"⛳":["golf"],"🏹":["archery","tir à l'arc"],"🎣":["fishing","pêche"],"🥊":["boxing","boxe"],"🥋":["martial arts","arts martiaux","karate","judo"],"🎿":["ski"],"🏂":["snowboard"],"🏊":["swimming","natation","nager"],"🚴":["cycling","vélo","cyclisme"],"🧗":["climbing","escalade"],"🏄":["surfing","surf"],"🧘":["yoga","méditation"],"🥇":["gold medal","médaille or"],"🥈":["silver medal","médaille argent"],"🥉":["bronze medal","médaille bronze"],
  "☀️":["sun","soleil"],"🌧️":["rain","pluie"],"⛈️":["storm","orage","tempête"],"🌩️":["thunder","tonnerre","éclair"],"🌨️":["snow","neige"],"🌬️":["wind","vent"],"💨":["wind","vent","souffle"],"🌪️":["tornado","tornade"],"🌫️":["fog","brouillard"],"☁️":["cloud","nuage"],"🌡️":["thermometer","thermomètre","température"],"☔":["umbrella","parapluie","pluie"],"⚡":["lightning","éclair","électricité"],
  "🇲🇦":["morocco","maroc"],"🇫🇷":["france"],"🇬🇧":["uk","royaume-uni","angleterre"],"🇺🇸":["usa","états-unis","amérique"],"🇪🇸":["spain","espagne"],"🇮🇹":["italy","italie"],"🇩🇪":["germany","allemagne"],"🇵🇹":["portugal"],"🇧🇪":["belgium","belgique"],"🇨🇭":["switzerland","suisse"],"🇳🇱":["netherlands","pays-bas"],"🇸🇦":["saudi","arabie saoudite"],"🇦🇪":["uae","émirats"],"🇶🇦":["qatar"],"🇪🇬":["egypt","égypte"],"🇹🇳":["tunisia","tunisie"],"🇩🇿":["algeria","algérie"],"🇹🇷":["turkey","turquie"],"🇬🇷":["greece","grèce"],"🇯🇵":["japan","japon"],"🇨🇳":["china","chine"],"🇰🇷":["korea","corée"],"🇮🇳":["india","inde"],"🇧🇷":["brazil","brésil"],"🇨🇦":["canada"],"🇦🇺":["australia","australie"],"🇷🇺":["russia","russie"],"🇺🇦":["ukraine"],
};

function insertImageEmoji(editor: Editor, item: ImageEmojiItem) {
  editor.chain().focus().insertContent(`<img src="${item.src}" alt="${item.alt}" style="display:inline;width:1.5em;height:1.5em;vertical-align:middle;" />`).run();
}

function EmojiPickerContent({ editor }: { editor: Editor }) {
  const [search, setSearch] = useState("");
  const q = search.toLowerCase().trim();

  const matchingEmojis = q
    ? Object.entries(EMOJI_KEYWORDS)
        .filter(([, kws]) => kws.some((kw) => kw.includes(q)))
        .map(([emoji]) => emoji)
    : null;

  const matchingImageEmojis = q
    ? CUSTOM_IMAGE_EMOJIS.filter((item) => {
        const kws = IMAGE_EMOJI_KEYWORDS[item.src];
        return kws?.some((kw) => kw.includes(q));
      })
    : null;

  const hasResults = (matchingEmojis && matchingEmojis.length > 0) || (matchingImageEmojis && matchingImageEmojis.length > 0);

  return (
    <>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un émoji…"
          className="w-full pl-7 pr-2 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2">
        {q ? (
          hasResults ? (
            <div className="flex flex-wrap gap-0.5">
              {matchingImageEmojis?.map((item) => (
                <button key={item.src} type="button" className="w-10 h-10 flex items-center justify-center rounded hover:bg-muted cursor-pointer transition-colors" onClick={() => insertImageEmoji(editor, item)} title={item.alt}>
                  <img src={item.src} alt={item.alt} className="w-7 h-7 object-contain" />
                </button>
              ))}
              {matchingEmojis?.map((emoji) => (
                <button key={emoji} type="button" className="w-10 h-10 flex items-center justify-center rounded hover:bg-muted text-2xl cursor-pointer transition-colors" onClick={() => editor.chain().focus().insertContent(emoji).run()}>
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun résultat</p>
          )
        ) : (
          <>
            {/* Maroc custom image emojis first */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">🇲🇦 Maroc</p>
              <div className="flex flex-wrap gap-0.5">
                {CUSTOM_IMAGE_EMOJIS.map((item) => (
                  <button key={item.src} type="button" className="w-10 h-10 flex items-center justify-center rounded hover:bg-muted cursor-pointer transition-colors" onClick={() => insertImageEmoji(editor, item)} title={item.alt}>
                    <img src={item.src} alt={item.alt} className="w-7 h-7 object-contain" />
                  </button>
                ))}
              </div>
            </div>
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="text-xs font-medium text-muted-foreground mb-1">{cat.label}</p>
                <div className="flex flex-wrap gap-0.5">
                  {cat.emojis.map((emoji) => (
                    <button key={emoji} type="button" className="w-10 h-10 flex items-center justify-center rounded hover:bg-muted text-2xl cursor-pointer transition-colors" onClick={() => editor.chain().focus().insertContent(emoji).run()}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}

const MAX_GRID = 8;

const TableGridPicker = ({ onSelect }: { onSelect: (rows: number, cols: number) => void }) => {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  return (
    <div className="select-none" style={{ width: MAX_GRID * 24 + (MAX_GRID - 1) * 3 }}>
      <p className="text-xs text-muted-foreground mb-2 text-center">
        {hover.r > 0 ? `${hover.r} × ${hover.c}` : "Choisir la taille"}
      </p>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${MAX_GRID}, 24px)`, gridAutoRows: "24px" }}>
        {Array.from({ length: MAX_GRID * MAX_GRID }, (_, i) => {
          const r = Math.floor(i / MAX_GRID) + 1;
          const c = (i % MAX_GRID) + 1;
          const active = r <= hover.r && c <= hover.c;
          return (
            <button
              key={i}
              type="button"
              className={`w-6 h-6 rounded-[2px] border transition-colors ${active ? "bg-primary border-primary" : "bg-muted border-border hover:border-muted-foreground/40"}`}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => onSelect(r, c)}
            />
          );
        })}
      </div>
    </div>
  );
};

const RichTextToolbar = ({ editor, simple }: RichTextToolbarProps) => {
  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL du lien:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("URL de l'image:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    const url = window.prompt("URL de la vidéo YouTube:");
    if (url) editor.chain().focus().setYoutubeVideo({ src: url, width: 640, height: 360 }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/50">
      {/* Text formatting */}
      <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Souligné">
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barré">
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      {!simple && (
        <ToolbarButton active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Surligner">
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
      )}
      <ToolbarButton active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()} title="Exposant">
        <Superscript className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()} title="Indice">
        <Subscript className="h-4 w-4" />
      </ToolbarButton>

      {/* Color picker */}
      {!simple && (
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Couleur du texte">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-5 gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => editor.chain().focus().setColor(color).run()}
              />
            ))}
          </div>
          <button
            type="button"
            className="mt-1 text-xs text-muted-foreground hover:text-foreground w-full text-center"
            onClick={() => editor.chain().focus().unsetColor().run()}
          >
            Réinitialiser
          </button>
        </PopoverContent>
      </Popover>
      )}

      <Sep />

      {/* Headings */}
      <ToolbarButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Titre 2">
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Titre 3">
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citation">
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur">
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Sep />

      {/* Alignment */}
      <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Aligner à gauche">
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Centrer">
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Aligner à droite">
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justifier">
        <AlignJustify className="h-4 w-4" />
      </ToolbarButton>

      <Sep />

      {/* Lists & links */}
      <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste à puces">
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée">
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      {!simple && (
        <ToolbarButton active={editor.isActive("link")} onClick={setLink} title="Lien">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
      )}

      <Sep />

      {/* Media & table */}
      {!simple && (
        <>
          <ToolbarButton onClick={addImage} title="Insérer image">
            <ImagePlus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={addYoutube} title="Insérer vidéo YouTube">
            <Youtube className="h-4 w-4" />
          </ToolbarButton>
        </>
      )}

      {/* Emoji picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insérer un émoji">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-2" align="start">
          <EmojiPickerContent editor={editor} />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant={editor.isActive("table") ? "secondary" : "ghost"} size="sm" className="h-8 w-8 p-0" title="Tableau">
            <TableIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 space-y-1" align="start">
          {!editor.isActive("table") && (
            <TableGridPicker onSelect={(rows, cols) => {
              editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
            }} />
          )}
          {editor.isActive("table") && (
            <>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs gap-2" onClick={() => editor.chain().focus().addColumnAfter().run()}>
                <ArrowRight className="h-3 w-3" /> Ajouter colonne
              </Button>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs gap-2" onClick={() => editor.chain().focus().addRowAfter().run()}>
                <ArrowDown className="h-3 w-3" /> Ajouter ligne
              </Button>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start text-xs gap-2 text-destructive" onClick={() => editor.chain().focus().deleteTable().run()}>
                <Trash2 className="h-3 w-3" /> Supprimer tableau
              </Button>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Spacer + undo/redo */}
      <div className="flex-1" />
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler">
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir">
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
};

export default RichTextToolbar;
