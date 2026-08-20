# Sammenfoejer PDF-/skrab-ombrudte linjer i en kildefil til flydende prosa.
#
# Graensen er ufravigelig: uddragene er ORDRETTE citater. Whitespace maa
# normaliseres og ombrudte linjer sammenfoejes — det aendrer ingen ord — men
# ikke ét ord maa aendres, tilfoejes eller fjernes. ordkontrol-funktionen
# nederst beviser det mod den gamle udgave.
#
# Regler (bevidst konservative):
#   1. En linje der starter med lille bogstav er en fortsaettelse — medmindre
#      den forrige linje afsluttede sin saetning (. : ; ! ?) eller er struktur.
#   2. En linje der ender paa komma er midt i sin saetning.
#   3. En linje der ender paa en dansk praeposition/konjunktion ("med", "paa",
#      "og", "til"...) uden tegnsaetning er midt i sin saetning — ogsaa naar
#      naeste linje starter med stort (egennavne som "Nexobrid").
#   4. Linjer der ender paa bindestreg samles IKKE til ét ord: dansk klinik er
#      fuld af aegte bindestregsord ("VAS-score") og suspenderede bindestreger
#      ("rtg- eller CT-"), som en orddelingsregel ikke kan skelne fra PDF'ens
#      orddeling. De joines med mellemrum; hvert tegn bevares.
#
# Struktur roeres aldrig: overskrifter, punktopstillinger, tabelraekker,
# citatblokke, billeder, links, HTML-kommentarer og metadatalinjer.
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

STRUKTUR = re.compile(r"^(#{1,6}\s|[-*•]\s|\d+[.)]\s|\||>|!\[|\[|<!--|\*\*Step|CASE-ID:|TITEL:|FORFATTERE:|INSTITUTION:)")
SLUTTER_SAETNING = re.compile(r"[.:;!?]\)?\"?\*?\s*$")
STARTER_SMAAT = re.compile(r"^[a-zæøåäöü]")
# Smaa ord ingen dansk saetning slutter paa. Kun ord der aldrig staar sidst.
HAENGEORD = re.compile(
    r"(?:^|\s)(med|paa|på|til|og|i|af|for|ved|under|over|mellem|mod|fra|om|hos|"
    r"efter|før|uden|som|at|en|et|den|det|de|eller|samt|end|hvor|når|naar|hvis|"
    r"skal|kan|bør|boer|er|har|bliver|via|jf|inkl|ekskl|ca|fx|dvs)$",
    re.I,
)


def sammenfoej(tekst, kun_whitespace=False):
    ud = []
    for raa in tekst.split("\n"):
        t = raa.rstrip()
        if t == "":
            ud.append("")
            continue
        if STRUKTUR.match(t):
            ud.append(t)
            continue
        # Gentagne mellemrum midt i prosa er skrab-/PDF-alignment, ikke indhold.
        # NBSP (\xa0) taeller med: web-skrab efterlader strenge af "\xa0 \xa0 ..."
        # som hverken renderes paent eller matches af et ASCII-mellemrumsmoenster.
        # Kun i ikke-struktur-linjer: tabelraekker og lister er undtaget ovenfor.
        t = re.sub(r"[  ]{2,}", " ", t.replace(" ", " ")).rstrip()
        if kun_whitespace:
            ud.append(t)
            continue
        i = len(ud) - 1
        while i >= 0 and ud[i] == "":
            i -= 1
        if i >= 0:
            forrige = ud[i]
            kan = not STRUKTUR.match(forrige) and not forrige.startswith("*")
            if kan:
                join = False
                if forrige.endswith(","):
                    join = True
                elif STARTER_SMAAT.match(t) and not SLUTTER_SAETNING.search(forrige):
                    join = True
                elif HAENGEORD.search(forrige) and not SLUTTER_SAETNING.search(forrige):
                    join = True
                if join:
                    ud[i] = f"{forrige} {t}"
                    del ud[i + 1:]
                    continue
        ud.append(t)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(ud))


def ordkontrol(gammel, ny, navn):
    go = re.findall(r"\S+", gammel)
    no = re.findall(r"\S+", ny)
    if go == no:
        print(f"  OK {navn}: ordstroem identisk ({len(go)} ord)")
        return True
    for k, (a, b) in enumerate(zip(go, no)):
        if a != b:
            print(f"  !! {navn}: afviger ved ord {k}: {go[k:k+6]} vs {no[k:k+6]}")
            return False
    print(f"  !! {navn}: laengde afviger: {len(go)} vs {len(no)}")
    return False


REPO = Path(r"C:\Projects\Freelance\magnus\corti-hackathon")
KILDER = REPO / "cosurg-mcp" / "data" / "kilder"

# --kun-whitespace: normalisér kun NBSP og gentagne mellemrum, sammenfoej ikke
# linjer. Til kilder der allerede ER hele afsnit (database-/API-markdown), hvor
# eneste problem er skrab-rester i selve teksten.
ok = True
kun_ws = "--kun-whitespace" in sys.argv
for navn in sys.argv[1:]:
    if navn.startswith("--"):
        continue
    sti = KILDER / navn
    gammel = sti.read_text(encoding="utf-8")
    ny = sammenfoej(gammel, kun_whitespace=kun_ws)
    if not ordkontrol(gammel, ny, navn):
        ok = False
        continue
    sti.write_text(ny, encoding="utf-8")
    linjer_foer = gammel.count("\n")
    print(f"     {navn}: {linjer_foer} -> {ny.count(chr(10))} linjer, {len(ny)} bytes")

sys.exit(0 if ok else 1)
