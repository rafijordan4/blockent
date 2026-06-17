(function() {
"use strict";

// ─────────────────────────────────────────────────────────────────────────────
//  BlockEnt Plugin for Blockbench 5.1.4
//  Gabungan Bedrock Block + Bedrock Entity
//  Fitur: Model, Texture, Display Settings, Animation Manager
//  Author: Rafi | Version: 1.0.0
// ─────────────────────────────────────────────────────────────────────────────

const PLUGIN_ID      = "blockent";
const PLUGIN_NAME    = "BlockEnt";
const PLUGIN_VERSION = "1.0.0";

// ══════════════════════════════════════════════════════════════════════════════
//  HELPER: Display Settings default
// ══════════════════════════════════════════════════════════════════════════════
function defaultDisplay() {
  return {
    thirdperson_righthand: { rotation:[75,45,0],  translation:[0,2.5,0], scale:[0.375,0.375,0.375] },
    thirdperson_lefthand:  { rotation:[75,45,0],  translation:[0,2.5,0], scale:[0.375,0.375,0.375] },
    firstperson_righthand: { rotation:[0,45,0],   translation:[0,0,0],   scale:[0.4,0.4,0.4] },
    firstperson_lefthand:  { rotation:[0,225,0],  translation:[0,0,0],   scale:[0.4,0.4,0.4] },
    ground:                { rotation:[0,0,0],    translation:[0,3,0],   scale:[0.25,0.25,0.25] },
    gui:                   { rotation:[30,225,0], translation:[0,0,0],   scale:[0.625,0.625,0.625] },
    head:                  { rotation:[0,0,0],    translation:[0,-7,0],  scale:[1,1,1] },
    fixed:                 { rotation:[0,0,0],    translation:[0,0,0],   scale:[0.5,0.5,0.5] },
  };
}

const SLOT_LABELS = {
  thirdperson_righthand: "Third Person Right Hand",
  thirdperson_lefthand:  "Third Person Left Hand",
  firstperson_righthand: "First Person Right Hand",
  firstperson_lefthand:  "First Person Left Hand",
  ground: "Ground",
  gui:    "GUI",
  head:   "Head",
  fixed:  "Item Frame (Fixed)",
};
const DISPLAY_SLOTS = Object.keys(SLOT_LABELS);

// ══════════════════════════════════════════════════════════════════════════════
//  CODEC — export / parse .blockent.json
// ══════════════════════════════════════════════════════════════════════════════
const blockent_codec = new Codec("blockent", {
  name:      "BlockEnt Model",
  extension: "blockent.json",
  remember:  true,
  load_filter: { type: "json", extensions: ["json"] },

  compile() {
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

    // Kumpulkan animasi dari timeline Blockbench
    const animations = Project._blockent_animations ? {...Project._blockent_animations} : {};
    if (window.Animation && Animation.all) {
      Animation.all.forEach(anim => {
        const boneData = {};
        if (anim.animators) {
          Object.keys(anim.animators).forEach(boneName => {
            const animator = anim.animators[boneName];
            const channels = {};
            ["rotation","position","scale"].forEach(ch => {
              if (!animator[ch] || !animator[ch].length) return;
              const kfs = {};
              animator[ch].forEach(kf => {
                const dp = kf.data_points && kf.data_points[0];
                kfs[kf.time] = dp ? [dp.x||0, dp.y||0, dp.z||0] : [0,0,0];
              });
              channels[ch] = kfs;
            });
            if (Object.keys(channels).length) boneData[boneName] = channels;
          });
        }
        animations[anim.name] = {
          loop:             anim.loop,
          animation_length: anim.length || undefined,
          bones:            boneData,
        };
      });
    }

    const out = {
      format_version: "1.12.0",
      "blockent:model": {
        description: {
          identifier:      Project.name || "blockent:unnamed",
          texture_width:   Project.texture_width  || 16,
          texture_height:  Project.texture_height || 16,
        },
        bones,
        display:    Project._blockent_display || defaultDisplay(),
        animations,
      },
    };
    return JSON.stringify(out, null, 2);
  },

  export() {
    const content = this.compile();
    Blockbench.export({
      type:      "JSON",
      extensions:["json"],
      name:      (Project.name || "model") + ".blockent",
      content,
      startpath: Project.export_path,
    }, path => { Project.export_path = path; });
  },

  parse(raw, path) {
    let data = raw["blockent:model"];
    if (!data && raw["minecraft:geometry"]) {
      data = raw["minecraft:geometry"][0];
    }
    if (!data) {
      Blockbench.showQuickMessage("❌ Format BlockEnt tidak dikenali", 2500);
      return;
    }
    if (data.description) {
      Project.name           = data.description.identifier || Project.name;
      Project.texture_width  = data.description.texture_width  || 16;
      Project.texture_height = data.description.texture_height || 16;
    }
    if (data.display)    Project._blockent_display    = data.display;
    if (data.animations) Project._blockent_animations = data.animations;
    if (data.bones) {
      data.bones.forEach(bone => {
        const group = new Group({
          name:     bone.name,
          origin:   bone.pivot    || [0,0,0],
          rotation: bone.rotation || [0,0,0],
        }).init().addTo();
        if (!bone.cubes) return;
        bone.cubes.forEach(c => {
          const size = c.size || [1,1,1];
          new Cube({
            name:     bone.name + "_cube",
            from:     c.origin || [0,0,0],
            to:       [
              (c.origin?.[0]||0)+size[0],
              (c.origin?.[1]||0)+size[1],
              (c.origin?.[2]||0)+size[2],
            ],
            origin:   c.pivot    || [0,0,0],
            rotation: c.rotation || [0,0,0],
          }).addTo(group);
        });
      });
    }
    Canvas.updateAll();
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  FORMAT
// ══════════════════════════════════════════════════════════════════════════════
const blockent_format = new ModelFormat({
  id:               "blockent",
  name:             "BlockEnt",
  description:      "Bedrock Block + Entity: model, texture, display, animasi",
  category:         "minecraft",
  target:           ["Minecraft: Bedrock Edition"],
  icon:             "extension",
  show_on_start_screen: true,
  box_uv:           true,
  optional_box_uv:  true,
  single_texture:   false,
  model_identifier: true,
  bone_rig:         true,
  centered_grid:    true,
  rotate_cubes:     true,
  integer_size:     false,
  uv_rotation:      true,
  animation_mode:   true,
  display_mode:     true,
  animation_files:  false,
  codec:            blockent_codec,
  onActivation()   {},
  onDeactivation()  {},
});

// ══════════════════════════════════════════════════════════════════════════════
//  DIALOG: Display Settings
// ══════════════════════════════════════════════════════════════════════════════
function openDisplayDialog() {
  if (!Project) return Blockbench.showQuickMessage("Tidak ada project aktif", 2000);
  if (!Project._blockent_display) Project._blockent_display = defaultDisplay();
  const disp = Project._blockent_display;

  const form = {};
  DISPLAY_SLOTS.forEach(slot => {
    const d = disp[slot] || {};
    const r = d.rotation    || [0,0,0];
    const t = d.translation || [0,0,0];
    const s = d.scale       || [1,1,1];
    form[`${slot}_sep`] = { type:"info", text:`──── ${SLOT_LABELS[slot]} ────` };
    form[`${slot}_rx`]  = { label:"Rot X",   type:"number", value:r[0] };
    form[`${slot}_ry`]  = { label:"Rot Y",   type:"number", value:r[1] };
    form[`${slot}_rz`]  = { label:"Rot Z",   type:"number", value:r[2] };
    form[`${slot}_tx`]  = { label:"Trans X", type:"number", value:t[0] };
    form[`${slot}_ty`]  = { label:"Trans Y", type:"number", value:t[1] };
    form[`${slot}_tz`]  = { label:"Trans Z", type:"number", value:t[2] };
    form[`${slot}_sx`]  = { label:"Scale X", type:"number", value:s[0] };
    form[`${slot}_sy`]  = { label:"Scale Y", type:"number", value:s[1] };
    form[`${slot}_sz`]  = { label:"Scale Z", type:"number", value:s[2] };
  });

  new Dialog({
    id:    "blockent_display",
    title: "BlockEnt – Display Settings",
    width: 500,
    form,
    onConfirm(res) {
      DISPLAY_SLOTS.forEach(slot => {
        disp[slot] = {
          rotation:    [res[`${slot}_rx`]||0, res[`${slot}_ry`]||0, res[`${slot}_rz`]||0],
          translation: [res[`${slot}_tx`]||0, res[`${slot}_ty`]||0, res[`${slot}_tz`]||0],
          scale:       [res[`${slot}_sx`]||1, res[`${slot}_sy`]||1, res[`${slot}_sz`]||1],
        };
      });
      Project._blockent_display = disp;
      Blockbench.showQuickMessage("✅ Display settings disimpan", 1500);
    },
  }).show();
}

// ══════════════════════════════════════════════════════════════════════════════
//  DIALOG: Animation Manager
// ══════════════════════════════════════════════════════════════════════════════
function openAnimationDialog() {
  if (!Project) return Blockbench.showQuickMessage("Tidak ada project aktif", 2000);
  if (!Project._blockent_animations) Project._blockent_animations = {};
  const anims = Project._blockent_animations;
  const keys   = Object.keys(anims);

  const listHtml = keys.length === 0
    ? `<p style="opacity:.5;margin:4px 0">Belum ada animasi tersimpan</p>`
    : keys.map(k => `
        <div style="padding:5px 0;border-bottom:1px solid #333;font-size:13px">
          <b>${k}</b>
          <span style="opacity:.6;margin-left:8px">
            loop: ${anims[k].loop ? "✓" : "✗"} |
            length: ${anims[k].animation_length ?? "auto"}s
          </span>
        </div>`).join("");

  new Dialog({
    id:    "blockent_anim",
    title: "BlockEnt – Animation Manager",
    width: 540,
    lines: [`
      <div style="padding:8px 4px">
        <div style="font-weight:bold;margin-bottom:6px">Animasi Tersimpan</div>
        <div style="max-height:160px;overflow-y:auto;padding-right:4px">${listHtml}</div>
      </div>
    `],
    form: {
      anim_name:   { label:"Nama Animasi", type:"text",     value:"animation.blockent.idle" },
      anim_loop:   { label:"Loop",         type:"checkbox", value:true },
      anim_length: { label:"Panjang (detik, 0=auto)", type:"number", value:0 },
      _info: { type:"info", text:"Keyframe diambil otomatis dari timeline Blockbench aktif" },
    },
    buttons: ["Tambah / Update", "Hapus", "Tutup"],
    onButton(index, res) {
      const name = (res.anim_name || "").trim();
      if (!name) return Blockbench.showQuickMessage("Nama animasi kosong!", 1500);

      if (index === 0) {
        // Kumpulkan keyframe dari timeline
        const boneData = {};
        if (window.Animation && Animation.all) {
          Animation.all.forEach(anim => {
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
          });
        }
        anims[name] = {
          loop:             res.anim_loop,
          animation_length: res.anim_length > 0 ? res.anim_length : undefined,
          bones:            boneData,
        };
        Project._blockent_animations = anims;
        Blockbench.showQuickMessage(`✅ Animasi "${name}" disimpan`, 1500);
        this.hide();
        setTimeout(openAnimationDialog, 200);

      } else if (index === 1) {
        if (!anims[name]) return Blockbench.showQuickMessage("Animasi tidak ditemukan", 1500);
        delete anims[name];
        Project._blockent_animations = anims;
        Blockbench.showQuickMessage(`🗑 Animasi "${name}" dihapus`, 1500);
        this.hide();
        setTimeout(openAnimationDialog, 200);
      }
    },
  }).show();
}

// ══════════════════════════════════════════════════════════════════════════════
//  ACTIONS
// ══════════════════════════════════════════════════════════════════════════════
const action_display = new Action("blockent_display", {
  name:        "BlockEnt: Display Settings",
  description: "Atur posisi display (tangan, GUI, ground, head, item frame)",
  icon:        "visibility",
  click:       openDisplayDialog,
});

const action_anim = new Action("blockent_animation", {
  name:        "BlockEnt: Animation Manager",
  description: "Kelola animasi BlockEnt",
  icon:        "movie",
  click:       openAnimationDialog,
});

const action_export = new Action("blockent_export", {
  name:        "BlockEnt: Export Model",
  description: "Export model ke format .blockent.json",
  icon:        "save",
  click() {
    if (!Project) return Blockbench.showQuickMessage("Tidak ada project aktif", 2000);
    blockent_codec.export();
  },
});

const action_new = new Action("blockent_new", {
  name:        "BlockEnt Project",
  description: "Buat project BlockEnt baru",
  icon:        "add_box",
  click() {
    if (newProject(blockent_format)) {
      setTimeout(() => {
        Project._blockent_display    = defaultDisplay();
        Project._blockent_animations = {};
        Blockbench.showQuickMessage("✅ Project BlockEnt siap!", 2000);
      }, 300);
    }
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  PLUGIN REGISTER
// ══════════════════════════════════════════════════════════════════════════════
BBPlugin.register(PLUGIN_ID, {
  title:       PLUGIN_NAME,
  author:      "Rafi",
  description: "Gabungan Bedrock Block + Bedrock Entity. Model & texture seperti biasa, plus Display Settings dan Animation Manager terintegrasi.",
  icon:        "extension",
  version:     PLUGIN_VERSION,
  min_version: "5.1.0",
  variant:     "both",
  tags:        ["Minecraft: Bedrock Edition", "Block", "Entity", "Animation", "Display"],

  onload() {
    MenuBar.addAction(action_display, "tools");
    MenuBar.addAction(action_anim,    "tools");
    MenuBar.addAction(action_export,  "tools");
    MenuBar.addAction(action_new,     "file.new");
    console.log(`[BlockEnt] v${PLUGIN_VERSION} loaded ✓`);
  },

  onunload() {
    blockent_format.delete();
    blockent_codec.delete();
    action_display.delete();
    action_anim.delete();
    action_export.delete();
    action_new.delete();
    console.log(`[BlockEnt] unloaded`);
  },
});

})();
