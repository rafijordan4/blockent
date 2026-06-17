(function() {
"use strict";

// ─────────────────────────────────────────────────────────────────────────────
//  BlockEnt Plugin — Blockbench 5.1.4
//  Tab "Mod" untuk connect ke Bedrock Behavior Pack + Resource Pack
//  Author: Rafi | Version: 2.0.0
// ─────────────────────────────────────────────────────────────────────────────

const PLUGIN_ID      = "blockent";
const PLUGIN_NAME    = "BlockEnt";
const PLUGIN_VERSION = "2.0.0";

let panel_mod = null;

// ══════════════════════════════════════════════════════════════════════════════
//  STATE — simpan path pack & identifier
// ══════════════════════════════════════════════════════════════════════════════
const State = {
  bp_path:    "",   // path Behavior Pack
  rp_path:    "",   // path Resource Pack
  identifier: "",   // misal: mymod:myblock
  geo_id:     "",   // misal: geometry.myblock
  texture:    "",   // nama texture file
  save() {
    localStorage.setItem("blockent_state", JSON.stringify({
      bp_path:    this.bp_path,
      rp_path:    this.rp_path,
      identifier: this.identifier,
      geo_id:     this.geo_id,
      texture:    this.texture,
    }));
  },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem("blockent_state") || "{}");
      this.bp_path    = d.bp_path    || "";
      this.rp_path    = d.rp_path    || "";
      this.identifier = d.identifier || "";
      this.geo_id     = d.geo_id     || "";
      this.texture    = d.texture    || "";
    } catch(e) {}
  },
};
State.load();

// ══════════════════════════════════════════════════════════════════════════════
//  HELPER: tulis file
// ══════════════════════════════════════════════════════════════════════════════
function writeFile(path, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, content, "utf8", err => err ? reject(err) : resolve());
  });
}

function ensureDir(dir) {
  return new Promise((resolve) => {
    fs.mkdir(dir, { recursive: true }, () => resolve());
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT: Geometry JSON (RP)
// ══════════════════════════════════════════════════════════════════════════════
function buildGeoJSON() {
  const bones = [];
  Group.all.forEach(group => {
    const bone = {
      name:     group.name,
      pivot:    group.origin.slice(),
      rotation: group.rotation.slice(),
      cubes:    [],
    };
    group.children.forEach(child => {
      if (!(child instanceof Cube)) return;
      bone.cubes.push({
        origin:   child.from.slice(),
        size:     [
          child.to[0]-child.from[0],
          child.to[1]-child.from[1],
          child.to[2]-child.from[2],
        ],
        pivot:    child.origin.slice(),
        rotation: child.rotation.slice(),
        uv:       child.faces,
      });
    });
    bones.push(bone);
  });

  return JSON.stringify({
    format_version: "1.12.0",
    "minecraft:geometry": [{
      description: {
        identifier:     State.geo_id || ("geometry." + (Project?.name || "model")),
        texture_width:  Project?.texture_width  || 16,
        texture_height: Project?.texture_height || 16,
      },
      bones,
    }],
  }, null, 2);
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT: Animations JSON (RP)
// ══════════════════════════════════════════════════════════════════════════════
function buildAnimationsJSON() {
  const animations = {};
  if (window.Animation && Animation.all && Animation.all.length) {
    Animation.all.forEach(anim => {
      const boneData = {};
      if (anim.animators) {
        Object.keys(anim.animators).forEach(boneName => {
          const animator = anim.animators[boneName];
          const channels = {};
          ["rotation","position","scale"].forEach(ch => {
            if (!animator[ch]?.length) return;
            const kfs = {};
            animator[ch].forEach(kf => {
              const dp = kf.data_points?.[0];
              kfs[kf.time] = dp ? [dp.x||0, dp.y||0, dp.z||0] : [0,0,0];
            });
            channels[ch] = kfs;
          });
          if (Object.keys(channels).length) boneData[boneName] = channels;
        });
      }
      animations[anim.name] = {
        loop:             anim.loop,
        animation_length: anim.length > 0 ? anim.length : undefined,
        bones:            boneData,
      };
    });
  }
  return JSON.stringify({ format_version: "1.8.0", animations }, null, 2);
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT: Entity JSON (RP) — render controller + geometry + texture
// ══════════════════════════════════════════════════════════════════════════════
function buildEntityRPJSON() {
  const id  = State.identifier || "blockent:model";
  const geo = State.geo_id     || ("geometry." + (Project?.name || "model"));
  const tex = State.texture    || (Project?.name || "model");
  return JSON.stringify({
    format_version: "1.10.0",
    "minecraft:client_entity": {
      description: {
        identifier:  id,
        materials:   { default: "entity_alphatest" },
        textures:    { default: `textures/entity/${tex}` },
        geometry:    { default: geo },
        animations:  {},
        render_controllers: ["controller.render.default"],
        spawn_egg:   { base_color: "#00aaff", overlay_color: "#ffffff" },
      },
    },
  }, null, 2);
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT: Entity JSON (BP) — komponen dasar
// ══════════════════════════════════════════════════════════════════════════════
function buildEntityBPJSON() {
  const id = State.identifier || "blockent:model";
  return JSON.stringify({
    format_version: "1.19.0",
    "minecraft:entity": {
      description: {
        identifier:          id,
        is_spawnable:        true,
        is_summonable:       true,
        is_experimental:     false,
      },
      component_groups: {},
      components: {
        "minecraft:physics":         {},
        "minecraft:pushable":        { is_pushable: true, is_pushable_by_piston: true },
        "minecraft:collision_box":   { width: 1, height: 1 },
        "minecraft:health":          { value: 20, max: 20 },
      },
      events: {},
    },
  }, null, 2);
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORT: Texture — salin dari Blockbench ke RP
// ══════════════════════════════════════════════════════════════════════════════
async function exportTextures(rpPath) {
  if (!Texture.all.length) return 0;
  const texDir = path.join(rpPath, "textures", "entity");
  await ensureDir(texDir);
  let count = 0;
  for (const tex of Texture.all) {
    if (!tex.source) continue;
    // tex.source adalah data URL base64
    const base64 = tex.source.replace(/^data:image\/\w+;base64,/, "");
    const buf    = Buffer.from(base64, "base64");
    const name   = (State.texture || tex.name || "texture") + ".png";
    await new Promise((res, rej) => {
      fs.writeFile(path.join(texDir, name), buf, err => err ? rej(err) : res());
    });
    count++;
  }
  return count;
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SAVE → BP + RP
// ══════════════════════════════════════════════════════════════════════════════
async function saveToMod() {
  if (!State.bp_path || !State.rp_path) {
    Blockbench.showMessageBox({
      title: "BlockEnt",
      message: "Path Behavior Pack dan Resource Pack belum diatur!\nBuka tab Mod dan isi dulu.",
      buttons: ["OK"],
    });
    return;
  }
  if (!Project) {
    return Blockbench.showQuickMessage("Tidak ada project aktif", 2000);
  }

  const name = Project.name || "model";
  const id   = State.identifier || `blockent:${name}`;

  try {
    // ── Resource Pack ──────────────────────────────────────────────
    const geoDir  = path.join(State.rp_path, "models", "entity");
    const animDir = path.join(State.rp_path, "animations");
    const entRPDir= path.join(State.rp_path, "entity");

    await ensureDir(geoDir);
    await ensureDir(animDir);
    await ensureDir(entRPDir);

    await writeFile(path.join(geoDir,   `${name}.geo.json`),        buildGeoJSON());
    await writeFile(path.join(entRPDir, `${name}.entity.json`),     buildEntityRPJSON());

    const animJSON = buildAnimationsJSON();
    const animData = JSON.parse(animJSON);
    if (Object.keys(animData.animations || {}).length) {
      await writeFile(path.join(animDir, `${name}.animation.json`), animJSON);
    }

    const texCount = await exportTextures(State.rp_path);

    // ── Behavior Pack ──────────────────────────────────────────────
    const entBPDir = path.join(State.bp_path, "entities");
    await ensureDir(entBPDir);
    await writeFile(path.join(entBPDir, `${name}.json`), buildEntityBPJSON());

    Blockbench.showMessageBox({
      title: "✅ BlockEnt — Save Berhasil!",
      message: [
        `Identifier : ${id}`,
        `Geometry   : ${State.geo_id || "geometry." + name}`,
        `Texture    : ${texCount} file`,
        ``,
        `RP → ${State.rp_path}`,
        `BP → ${State.bp_path}`,
      ].join("\n"),
      buttons: ["OK"],
    });

  } catch(err) {
    Blockbench.showMessageBox({
      title: "❌ BlockEnt — Error",
      message: String(err),
      buttons: ["OK"],
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  PANEL MOD — UI sidebar
// ══════════════════════════════════════════════════════════════════════════════
function buildPanelHTML() {
  return /* html */`
<style>
#blockent-panel {
  padding: 10px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
#blockent-panel h3 {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--color-accent);
  letter-spacing: .5px;
}
.be-section {
  background: var(--color-back);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.be-label {
  font-size: 11px;
  opacity: .65;
  margin-bottom: 2px;
}
.be-row {
  display: flex;
  gap: 6px;
  align-items: center;
}
.be-row input[type=text] {
  flex: 1;
  background: var(--color-input);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 4px;
  padding: 4px 7px;
  font-size: 12px;
  outline: none;
}
.be-row input[type=text]:focus {
  border-color: var(--color-accent);
}
.be-btn {
  background: var(--color-button);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 3px 9px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.be-btn:hover { background: var(--color-accent); color: #fff; }
.be-save-btn {
  width: 100%;
  padding: 8px;
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: bold;
  cursor: pointer;
  letter-spacing: .3px;
}
.be-save-btn:hover { opacity: .85; }
.be-path-display {
  font-size: 11px;
  opacity: .5;
  word-break: break-all;
  min-height: 14px;
}
.be-status {
  font-size: 11px;
  text-align: center;
  opacity: .5;
  margin-top: 2px;
}
</style>

<div id="blockent-panel">

  <h3>⬡ BlockEnt</h3>

  <!-- Identifier -->
  <div class="be-section">
    <div class="be-label">IDENTIFIER</div>
    <div class="be-row">
      <input type="text" id="be-identifier" placeholder="mymod:myblock" value="${State.identifier}">
    </div>
    <div class="be-label" style="margin-top:2px">GEOMETRY ID</div>
    <div class="be-row">
      <input type="text" id="be-geo-id" placeholder="geometry.myblock" value="${State.geo_id}">
    </div>
    <div class="be-label" style="margin-top:2px">NAMA TEXTURE</div>
    <div class="be-row">
      <input type="text" id="be-texture" placeholder="myblock" value="${State.texture}">
    </div>
  </div>

  <!-- Behavior Pack -->
  <div class="be-section">
    <div class="be-label">📦 BEHAVIOR PACK</div>
    <div class="be-row">
      <input type="text" id="be-bp-path" placeholder="Pilih folder BP..." value="${State.bp_path}" readonly>
      <button class="be-btn" onclick="blockentPickBP()">Browse</button>
    </div>
    <div class="be-path-display" id="be-bp-status">${State.bp_path ? "✓ " + State.bp_path : ""}</div>
  </div>

  <!-- Resource Pack -->
  <div class="be-section">
    <div class="be-label">🎨 RESOURCE PACK</div>
    <div class="be-row">
      <input type="text" id="be-rp-path" placeholder="Pilih folder RP..." value="${State.rp_path}" readonly>
      <button class="be-btn" onclick="blockentPickRP()">Browse</button>
    </div>
    <div class="be-path-display" id="be-rp-status">${State.rp_path ? "✓ " + State.rp_path : ""}</div>
  </div>

  <!-- Save -->
  <button class="be-save-btn" onclick="blockentSave()">
    💾 Save ke Mod (BP + RP)
  </button>

  <div class="be-status">BlockEnt v${PLUGIN_VERSION} · Model + Texture + Animasi</div>
</div>
`;
}

// ── Fungsi yang dipanggil dari HTML panel ─────────────────────────────────────
function pickFolder(callback) {
  const input = document.createElement("input");
  input.type = "file";
  input.setAttribute("nwdirectory", "");
  input.onchange = () => {
    if (input.files?.[0]) callback(input.files[0].path);
  };
  input.click();
}

window.blockentPickBP = function() {
  pickFolder(p => {
    State.bp_path = p;
    State.save();
    const el = document.getElementById("be-bp-path");
    const st = document.getElementById("be-bp-status");
    if (el) el.value = p;
    if (st) st.textContent = "✓ " + p;
  });
};

window.blockentPickRP = function() {
  pickFolder(p => {
    State.rp_path = p;
    State.save();
    const el = document.getElementById("be-rp-path");
    const st = document.getElementById("be-rp-status");
    if (el) el.value = p;
    if (st) st.textContent = "✓ " + p;
  });
};

window.blockentSave = function() {
  // Ambil nilai terkini dari input
  const idEl  = document.getElementById("be-identifier");
  const geoEl = document.getElementById("be-geo-id");
  const texEl = document.getElementById("be-texture");
  if (idEl)  State.identifier = idEl.value.trim();
  if (geoEl) State.geo_id     = geoEl.value.trim();
  if (texEl) State.texture     = texEl.value.trim();
  State.save();
  saveToMod();
};

// ══════════════════════════════════════════════════════════════════════════════
//  REGISTER PANEL
// ══════════════════════════════════════════════════════════════════════════════
function registerPanel() {
  panel_mod = new Panel("blockent_mod", {
    name:     "Mod",
    icon:     "cookie",
    condition: { modes: ["edit", "paint", "animate", "display"] },
    default_position: {
      slot:        "right_bar",
      float_position: [0, 0],
      float_size:  [300, 500],
      folded:      false,
    },
    component: {
      template: `<div></div>`,
      mounted() {
        this.$el.innerHTML = buildPanelHTML();
      },
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
//  ACTION: Save to Mod (shortcut menu)
// ══════════════════════════════════════════════════════════════════════════════
const action_save_mod = new Action("blockent_save_mod", {
  name:        "BlockEnt: Save ke Mod",
  description: "Export model, texture & animasi langsung ke BP + RP",
  icon:        "save",
  keybind:     new Keybind({ key: "s", ctrl: true, shift: true }),
  click:       () => {
    const idEl  = document.getElementById("be-identifier");
    const geoEl = document.getElementById("be-geo-id");
    const texEl = document.getElementById("be-texture");
    if (idEl)  State.identifier = idEl.value.trim();
    if (geoEl) State.geo_id     = geoEl.value.trim();
    if (texEl) State.texture     = texEl.value.trim();
    State.save();
    saveToMod();
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  PLUGIN REGISTER
// ══════════════════════════════════════════════════════════════════════════════
BBPlugin.register(PLUGIN_ID, {
  title:       PLUGIN_NAME,
  author:      "Rafi",
  description: "Tab Mod di Blockbench — export model, texture & animasi langsung ke Bedrock Behavior Pack + Resource Pack.",
  icon:        "cookie",
  version:     PLUGIN_VERSION,
  min_version: "5.1.0",
  variant:     "desktop",
  tags:        ["Minecraft: Bedrock Edition", "Export", "Behavior Pack", "Resource Pack"],

  onload() {
    registerPanel();
    MenuBar.addAction(action_save_mod, "file");
    console.log(`[BlockEnt] v${PLUGIN_VERSION} loaded ✓`);
  },

  onunload() {
    if (panel_mod) panel_mod.delete();
    action_save_mod.delete();
    delete window.blockentPickBP;
    delete window.blockentPickRP;
    delete window.blockentSave;
    console.log(`[BlockEnt] unloaded`);
  },
});

})();
