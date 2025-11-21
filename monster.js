// ================== GLOBALS ==================
let themes = {}, mutations = [], bossTemplates = {};
let currentMonster = null;

// ================== UTILITY FUNCTIONS ==================
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function mod(score){ return Math.floor((score-10)/2); }
function collapseHTML(title, body){ return `<button class="collapsible">${title}</button><div class="content">${body}</div>`; }
function setupCollapsibles(){
    const coll = document.getElementsByClassName("collapsible");
    for(let el of coll){
        el.onclick = function(){
            this.classList.toggle("active");
            const content = this.nextElementSibling;
            content.style.display = (content.style.display==="block") ? "none" : "block";
        };
    }
}

// ================== LOAD JSON DATA ==================
async function loadData(){
    try {
        const [tRes, mRes, bRes] = await Promise.all([
            fetch("data/themes.json"),
            fetch("data/mutations.json"),
            fetch("data/bossTemplates.json")
        ]);
        themes = await tRes.json();
        mutations = await mRes.json();
        bossTemplates = await bRes.json();
        console.log("Data loaded from files.");
    } catch(err){
        console.warn("Could not fetch JSON files, using fallback data:", err);
        // FALLBACK DATA
        themes = {
            "fire": {
                "name": "Fire",
                "res": ["fire"],
                "abilities": ["Burning Aura","Flame Body","Inferno Surge"],
                "spells": {"atwill":["Fire Bolt"],"daily":["Burning Hands","Fireball"]},
                "attacks": ["Fire Burst","Ember Bite"]
            },
            "cold": {
                "name": "Cold",
                "res": ["cold"],
                "abilities": ["Frost Armor","Freezing Touch"],
                "spells": {"atwill":["Ray of Frost"],"daily":["Ice Knife","Cone of Cold"]},
                "attacks": ["Frost Crack","Frozen Claw"]
            }
        };
        mutations = [
            {"name": "Chitin Plating", "effect": "AC +2"},
            {"name": "Adrenal Surge", "effect": "+1 attack bonus"}
        ];
        bossTemplates = {
            "miniboss": {"name":"Mini-Boss","hp":1.25,"ac":0,"atk":2,"abilities":1,"mutations":1}
        };
    }
}


async function loadPacks(){
    const files = document.getElementById('packFile').files;
    if(files.length===0){ alert("Select at least one JSON file."); return; }

    for(let file of files){
        const reader = new FileReader();
        reader.onload = function(e){
            try{
                const data = JSON.parse(e.target.result);
                if(data.type==="theme"){
                    themes[data.name] = data;
                } else if(data.type==="mutation"){
                    mutations.push(data);
                } else if(data.type==="boss"){
                    bossTemplates[data.name] = data;
                } else {
                    console.warn("Unknown pack type:", data);
                }
            } catch(err){ console.error("Failed to load pack", file.name, err); }
        };
        reader.readAsText(file);
    }
    alert("Packs loaded successfully! You can now generate monsters using the new content.");
}


// Call loadData immediately
loadData();

// ================== ATTACK & SPELL GENERATION ==================
function generateAttacks(themeA, themeB, cr, bossBonus=0){
    const pool = [...themeA.attacks, ...themeB.attacks];
    const count = Math.floor(Math.random()*3)+2;
    let res = [];
    for(let i=0;i<count;i++){
        res.push({
            name: pick(pool),
            bonus: Math.floor(cr/2)+3+bossBonus,
            damage: (cr>=15?"4d12":cr>=8?"3d10":"2d8"),
            type: pick([themeA.name.toLowerCase(), themeB.name.toLowerCase()])
        });
    }
    return res;
}

function generateSpells(themeA, themeB, abilityMod){
    const atwill = pick([...themeA.spells.atwill, ...themeB.spells.atwill]);
    const daily = [pick(themeA.spells.daily), pick(themeB.spells.daily)];
    const dc = 8 + abilityMod + 3;
    return {dc, hit: abilityMod+3, atwill, daily};
}

// ================== MONSTER GENERATION ==================
function generateMonster(){
    if(Object.keys(themes).length===0){
        alert("Data not loaded yet! Please wait a moment.");
        return;
    }

    const monsterDiv = document.getElementById("monster");

    const name = pick(["Gloomfang","Storm Harrower","Ash Hydra","Voidprowler","Hex Serpent"]);
    const size = pick(["Small","Medium","Large","Huge"]);
    const type = pick(["Monstrosity","Dragon","Aberration","Fiend","Undead"]);
    const alignment = pick(["Neutral","Chaotic Evil","Lawful Good","Chaotic Neutral","Neutral Evil"]);

    let themeKeys = Object.keys(themes);
    let tA = themes[pick(themeKeys)];
    let tB = themes[pick(themeKeys)];
    while(tA === tB) tB = themes[pick(themeKeys)];

    let hp = Math.floor(Math.random()*120)+40;
    let ac = Math.floor(Math.random()*4)+12;
    const cr = Math.floor((hp+ac)/20);

    const stats = {
        STR: 10+cr+Math.floor(Math.random()*3),
        DEX: 10+Math.floor(Math.random()*5),
        CON: 12+cr,
        INT: 8+Math.floor(Math.random()*6),
        WIS: 8+Math.floor(Math.random()*6),
        CHA: 10+Math.floor(Math.random()*6)
    };

    const saves = {
        STR: mod(stats.STR)+pick([0,1,2]),
        DEX: mod(stats.DEX)+pick([0,1,2]),
        CON: mod(stats.CON)+pick([0,1,2]),
        INT: mod(stats.INT)+pick([0,1,2]),
        WIS: mod(stats.WIS)+pick([0,1,2]),
        CHA: mod(stats.CHA)+pick([0,1,2])
    };

    const skills = {
        Perception: mod(stats.WIS)+pick([0,1,2]),
        Stealth: mod(stats.DEX)+pick([0,1,2]),
        Arcana: mod(stats.INT)+pick([0,1,2])
    };

    const senses = "Darkvision 60 ft., Passive Perception "+(10+mod(stats.WIS));

    // Mutations
    let chosenMut=[];
    const mutCount = (cr>14?3:cr>8?2:1);
    for(let i=0;i<mutCount;i++) chosenMut.push(pick(mutations));

    // Boss template
    let boss=null;
    if(Math.random()<0.35){boss=pick(Object.values(bossTemplates)); hp=Math.floor(hp*boss.hp); ac+=boss.ac;}

    const atkBonus = boss ? boss.atk : 0;
    const attacks = generateAttacks(tA,tB,cr,atkBonus);
    const spells = generateSpells(tA,tB,mod(stats.CHA));

    let abilities = [pick(tA.abilities), pick(tB.abilities)];
    if(boss){for(let i=0;i<boss.abilities;i++) abilities.push(pick([...tA.abilities,...tB.abilities]));}

    const res = Array.from(new Set([...tA.res,...tB.res]));

    // Render monster
    let atkHTML = attacks.map(a=>`<div class="action-block"><b>${a.name}.</b> +${a.bonus} to hit, ${a.damage} ${a.type} damage.</div>`).join("");
    let mutHTML = chosenMut.map(m=>`<div class="action-block"><b>${m.name}.</b> ${m.effect}</div>`).join("");
    let abilityHTML = `<table class="abilities-table">
<tr><th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th></tr>
<tr><td>${stats.STR} (${mod(stats.STR)>=0?"+":""}${mod(stats.STR)})</td>
<td>${stats.DEX} (${mod(stats.DEX)>=0?"+":""}${mod(stats.DEX)})</td>
<td>${stats.CON} (${mod(stats.CON)>=0?"+":""}${mod(stats.CON)})</td>
<td>${stats.INT} (${mod(stats.INT)>=0?"+":""}${mod(stats.INT)})</td>
<td>${stats.WIS} (${mod(stats.WIS)>=0?"+":""}${mod(stats.WIS)})</td>
<td>${stats.CHA} (${mod(stats.CHA)>=0?"+":""}${mod(stats.CHA)})</td></tr></table>`;

    monsterDiv.innerHTML=`
<h2>${name}${boss?` — <span style="color:#8a2929">${boss.name}</span>`:""}</h2>
<p class="statline">${size} ${type}, ${alignment}</p>
<p class="statline"><b>AC:</b> ${ac} &nbsp;&nbsp; <b>HP:</b> ${hp} &nbsp;&nbsp; <b>Speed:</b> 30 ft.</p>
${abilityHTML}
<p class="statline"><b>Saving Throws:</b> STR ${saves.STR>=0?"+":""}${saves.STR}, DEX ${saves.DEX>=0?"+":""}${saves.DEX}, CON ${saves.CON>=0?"+":""}${saves.CON}</p>
<p class="statline"><b>Skills:</b> Perception ${skills.Perception>=0?"+":""}${skills.Perception}, Stealth ${skills.Stealth>=0?"+":""}${skills.Stealth}, Arcana ${skills.Arcana>=0?"+":""}${skills.Arcana}</p>
<p class="statline"><b>Damage Resistances:</b> ${res.join(", ")||"None"}</p>
<p class="statline"><b>Senses:</b> ${senses}</p>
<p class="statline"><b>Languages:</b> Common</p>
<p class="statline"><b>Challenge:</b> ${cr}</p>
${collapseHTML("Special Abilities",abilities.map(a=>`<div class="action-block">${a}</div>`).join(""))}
${collapseHTML("Mutations",mutHTML||"<div class='action-block'>No mutations</div>")}
${collapseHTML("Spellcasting",`<div class='action-block'><b>Spellcasting.</b> Spell save DC ${spells.dc}, +${spells.hit} to hit. At will: ${spells.atwill}. 1/day: ${spells.daily.join(", ")}.</div>`)}
${collapseHTML("Actions",atkHTML)}
`;

    monsterDiv.style.display="block";
    setupCollapsibles();

    currentMonster = {name, size, type, alignment, hp, ac, cr, stats, saves, skills, senses, resistances: res, abilities, mutations: chosenMut, attacks, spells, boss: boss?boss.name:null};
}

// ================== EXPORT / IMPORT ==================
function exportMonster(){
    if(!currentMonster){ alert("Generate a monster first!"); return; }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentMonster,null,2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `${currentMonster.name.replace(/\s+/g,"_")}.json`);
    dlAnchor.click();
}

function importMonster(){
    const fileInput = document.getElementById('importFile');
    if(!fileInput.files.length){ alert("Select a JSON file to import!"); return; }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = function(e){
        try {
            const data = JSON.parse(e.target.result);
            currentMonster = data;
            renderMonsterFromJSON(data);
        } catch(err){ alert("Invalid JSON file!"); console.error(err); }
    };
    reader.readAsText(file);
}

function renderMonsterFromJSON(monster){
    const monsterDiv = document.getElementById("monster");
    const {name, size, type, alignment, hp, ac, cr, stats, saves, skills, senses,
           resistances, abilities, mutations, attacks, spells, boss} = monster;

    let atkHTML = attacks.map(a=>`<div class="action-block"><b>${a.name}.</b> +${a.bonus} to hit, ${a.damage} ${a.type} damage.</div>`).join("");
    let mutHTML = mutations.map(m=>`<div class="action-block"><b>${m.name}.</b> ${m.effect}</div>`).join("");
    let abilityHTML = `<table class="abilities-table">
<tr><th>STR</th><th>DEX</th><th>CON</th><th>INT</th><th>WIS</th><th>CHA</th></tr>
<tr><td>${stats.STR} (${mod(stats.STR)>=0?"+":""}${mod(stats.STR)})</td>
<td>${stats.DEX} (${mod(stats.DEX)>=0?"+":""}${mod(stats.DEX)})</td>
<td>${stats.CON} (${mod(stats.CON)>=0?"+":""}${mod(stats.CON)})</td>
<td>${stats.INT} (${mod(stats.INT)>=0?"+":""}${mod(stats.INT)})</td>
<td>${stats.WIS} (${mod(stats.WIS)>=0?"+":""}${mod(stats.WIS)})</td>
<td>${stats.CHA} (${mod(stats.CHA)>=0?"+":""}${mod(stats.CHA)})</td></tr></table>`;

    monsterDiv.innerHTML=`
<h2>${name}${boss?` — <span style="color:#8a2929">${boss}</span>`:""}</h2>
<p class="statline">${size} ${type}, ${alignment}</p>
<p class="statline"><b>AC:</b> ${ac} &nbsp;&nbsp; <b>HP:</b> ${hp} &nbsp;&nbsp; <b>Speed:</b> 30 ft.</p>
${abilityHTML}
<p class="statline"><b>Saving Throws:</b> STR ${saves.STR>=0?"+":""}${saves.STR}, DEX ${saves.DEX>=0?"+":""}${saves.DEX}, CON ${saves.CON>=0?"+":""}${saves.CON}</p>
<p class="statline"><b>Skills:</b> Perception ${skills.Perception>=0?"+":""}${skills.Perception}, Stealth ${skills.Stealth>=0?"+":""}${skills.Stealth}, Arcana ${skills.Arcana>=0?"+":""}${skills.Arcana}</p>
<p class="statline"><b>Damage Resistances:</b> ${resistances.join(", ")||"None"}</p>
<p class="statline"><b>Senses:</b> ${senses}</p>
<p class="statline"><b>Languages:</b> Common</p>
<p class="statline"><b>Challenge:</b> ${cr}</p>
${collapseHTML("Special Abilities",abilities.map(a=>`<div class="action-block">${a}</div>`).join(""))}
${collapseHTML("Mutations",mutHTML||"<div class='action-block'>No mutations</div>")}
${collapseHTML("Spellcasting",`<div class='action-block'><b>Spellcasting.</b> Spell save DC ${spells.dc}, +${spells.hit} to hit. At will: ${spells.atwill}. 1/day: ${spells.daily.join(", ")}.</div>`)}
${collapseHTML("Actions",atkHTML)}
`;
    monsterDiv.style.display="block";
    setupCollapsibles();
}

