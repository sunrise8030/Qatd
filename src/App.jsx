import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, Search, Volume2, BookOpen } from "lucide-react";

const SURAHS = [
  {
    id: 12,
    slug: "yusuf",
    nameAr: "يوسف",
    nameTr: "Yusuf",
    nameDe: "Yusuf",
    ayahCount: 111,
    audioUrl: "/audio/yusuf.mp3",
    versesUrl: "/data/yusuf.json",
  },
  {
    id: 1,
    slug: "fatiha",
    nameAr: "الفاتحة",
    nameTr: "Fâtiha",
    nameDe: "Al-Fātiha",
    ayahCount: 7,
    audioUrl: "/audio/fatiha.mp3",
    versesUrl: "/data/fatiha.json",
  },
  {
    id: 112,
    slug: "ihlas",
    nameAr: "الإخلاص",
    nameTr: "İhlâs",
    nameDe: "Al-Ichlās",
    ayahCount: 4,
    audioUrl: "/audio/ihlas.mp3",
    versesUrl: "/data/ihlas.json",
  },
];

const SAMPLE_VERSES = {
  yusuf: [
    {
      ayah: 1,
      ar: "الر ۚ تِلْكَ آيَاتُ الْكِتَابِ الْمُبِينِ",
      tr: "Elif Lâm Râ. Bunlar apaçık kitabın ayetleridir.",
      de: "Alif Lām Rā. Dies sind die Zeichen des deutlichen Buches.",
      start: 0,
      end: 5,
    },
    {
      ayah: 2,
      ar: "إِنَّا أَنزَلْنَاهُ قُرْآنًا عَرَبِيًّا لَّعَلَّكُمْ تَعْقِلُونَ",
      tr: "Şüphesiz biz onu Arapça bir Kur’an olarak indirdik ki anlayasınız.",
      de: "Wir haben ihn als einen arabischen Koran herabgesandt, auf dass ihr begreifen möget.",
      start: 5,
      end: 11,
    },
    {
      ayah: 3,
      ar: "نَحْنُ نَقُصُّ عَلَيْكَ أَحْسَنَ الْقَصَصِ بِمَا أَوْحَيْنَا إِلَيْكَ هَٰذَا الْقُرْآنَ",
      tr: "Biz sana bu Kur’an’ı vahyetmekle kıssaların en güzelini anlatıyoruz.",
      de: "Wir berichten dir mit dieser Offenbarung des Korans die schönste Erzählung.",
      start: 11,
      end: 19,
    },
  ],
  fatiha: [
    {
      ayah: 1,
      ar: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      tr: "Rahmân ve Rahîm olan Allah’ın adıyla.",
      de: "Im Namen Allahs, des Allerbarmers, des Barmherzigen.",
      start: 0,
      end: 4,
    },
    {
      ayah: 2,
      ar: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      tr: "Hamd, âlemlerin Rabbi Allah’a mahsustur.",
      de: "Alles Lob gebührt Allah, dem Herrn der Welten.",
      start: 4,
      end: 8,
    },
  ],
  ihlas: [
    {
      ayah: 1,
      ar: "قُلْ هُوَ اللَّهُ أَحَدٌ",
      tr: "De ki: O Allah birdir.",
      de: "Sag: Er ist Allah, der Eine.",
      start: 0,
      end: 3,
    },
  ],
};

async function loadVerses(surah) {
  try {
    const res = await fetch(surah.versesUrl);
    if (!res.ok) throw new Error("JSON yüklenemedi");
    return await res.json();
  } catch {
    return SAMPLE_VERSES[surah.slug] || [];
  }
}

export default function QuranPlayerApp() {
  const audioRef = useRef(null);
  const verseRefs = useRef({});
  const [query, setQuery] = useState("");
  const [selectedSurahId, setSelectedSurahId] = useState(12);
  const [verses, setVerses] = useState([]);
  const [activeAyah, setActiveAyah] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedSurah = useMemo(
    () => SURAHS.find((s) => s.id === selectedSurahId) || SURAHS[0],
    [selectedSurahId]
  );

  const filteredSurahs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHS;
    return SURAHS.filter((s) =>
      [s.nameTr, s.nameDe, s.nameAr, String(s.id), s.slug]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setActiveAyah(null);
    loadVerses(selectedSurah).then((data) => {
      if (!mounted) return;
      setVerses(data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [selectedSurah]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.load();
    setIsPlaying(false);
  }, [selectedSurah]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      const current = verses.find((v) => t >= v.start && t < v.end);
      if (current && current.ayah !== activeAyah) {
        setActiveAyah(current.ayah);
        const el = verseRefs.current[current.ayah];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      if (!current) setActiveAyah(null);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [verses, activeAyah]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const seekToAyah = (ayah) => {
    const audio = audioRef.current;
    const verse = verses.find((v) => v.ayah === ayah);
    if (!audio || !verse) return;
    audio.currentTime = verse.start;
    audio.play();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 md:p-6 lg:grid-cols-[320px_1fr]">
        <Card className="rounded-2xl shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5" />
              Sure Listesi
            </CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Sure ara..."
                className="rounded-xl pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] lg:h-[calc(100vh-14rem)] pr-3">
              <div className="space-y-2">
                {filteredSurahs.map((surah) => {
                  const active = surah.id === selectedSurahId;
                  return (
                    <button
                      key={surah.id}
                      onClick={() => setSelectedSurahId(surah.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm opacity-80">{surah.id}. sure</div>
                          <div className="mt-1 text-lg font-semibold">{surah.nameTr}</div>
                          <div className="text-sm opacity-80">{surah.nameDe}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl leading-none">{surah.nameAr}</div>
                          <div className="mt-2 text-xs opacity-80">{surah.ayahCount} ayet</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedSurah.nameTr}</CardTitle>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedSurah.nameDe} · {selectedSurah.nameAr} · {selectedSurah.ayahCount} ayet
                  </p>
                </div>
                <Button onClick={togglePlay} className="rounded-2xl">
                  {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isPlaying ? "Duraklat" : "Oynat"}
                </Button>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                  <Volume2 className="h-4 w-4" />
                  Ses oynatıcı
                </div>
                <audio ref={audioRef} controls className="w-full">
                  <source src={selectedSurah.audioUrl} type="audio/mpeg" />
                  Tarayıcınız ses çaları desteklemiyor.
                </audio>
              </div>
            </CardHeader>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Ayetler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border bg-slate-100 p-3 text-sm font-medium text-slate-600 md:grid-cols-[80px_1.3fr_1fr_1fr]">
                <div>No</div>
                <div className="text-right md:text-right">Arapça</div>
                <div>Almanca</div>
                <div>Türkçe</div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-slate-500">
                  Sure yükleniyor...
                </div>
              ) : (
                <div className="space-y-3">
                  {verses.map((verse) => {
                    const active = verse.ayah === activeAyah;
                    return (
                      <button
                        key={verse.ayah}
                        ref={(el) => {
                          verseRefs.current[verse.ayah] = el;
                        }}
                        onClick={() => seekToAyah(verse.ayah)}
                        className={`grid w-full grid-cols-1 gap-3 rounded-2xl border p-4 text-left transition md:grid-cols-[80px_1.3fr_1fr_1fr] ${
                          active
                            ? "border-slate-900 bg-amber-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <span>#{verse.ayah}</span>
                          <Play className="h-4 w-4 opacity-60" />
                        </div>
                        <div className="text-right text-2xl leading-10 md:text-3xl" dir="rtl">
                          {verse.ar}
                        </div>
                        <div className="text-base leading-7 text-slate-700">{verse.de}</div>
                        <div className="text-base leading-7 text-slate-700">{verse.tr}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
