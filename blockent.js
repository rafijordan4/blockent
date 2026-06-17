(function() {
"use strict";

// ─── BlockEnt Plugin for Blockbench 5.1.4 ───────────────────────────────────
// Menggabungkan Bedrock Block + Bedrock Entity → Model, Texture, Display, Animasi

const PLUGIN_ID = "blockent";
const PLUGIN_NAME = "BlockEnt";
const PLUGIN_VERSION = "1.0.0";

// ── Codec Definition ──────────────────────────────────────────────────────────
const blockent_codec = new Codec("blockent", {
  name: "BlockEnt Model",
  extension: "blockent.json",
  remember: true,
  load_filter: {
    type: "json",
    extensions: ["json"],
  },

  export() {
    const model = {
      format_version: "1.12.0",
      "blockent:model": {
        description: {
          identifier: Project.name || "blockent:unnamed",
          texture_width: Project.texture_width || 16,
          texture_height: Project.texture_height || 16,
        },
        bones: [],
        display: getDisplaySettings(),
        animations: getAnimationExport(),
      },
    };

    // Export bones/groups
    Group.all.forEach((group) => {
      const bone = {
        name: group.name,
        pivot: group.origin.slice(),
        rotation: group.rotation.slice(),
        cubes: [],
      };
      group.children.forEach((child) => {
        if (child instanceof Cube) {
          bone.cubes.push({
            origin: child.from.slice(),
            size: [
              child.to[0] - child.from[0],
              child.to[1] - child.from[1],
              child.to[2] - child.from[2],
            ],
            pivot: child.origin.slice(),
            rotation: child.rotation.slice(),
            uv: child.faces,
          });
        }
      });
      model["blockent:model"].bones.push(bone);
    });

    return JSON.stringify(model, null, 2);
  },

  compile(options) {
    return this.export();
  },

  parse(model, path) {
    const data = model["blockent:model"] || model["minecraft:geometry"]?.[0];
    if (!data) {
      Blockbench.showQuickMessage("Format BlockEnt tidak dikenali", 2000);
      return;
    }
    // Parse bones
    if (data.bones) {
      data.bones.forEach((bone) => {
        const group = new Group({
          name: bone.name,
          origin: bone.pivot || [0, 0, 0],
          rotation: bone.rotation || [0, 0, 0],
        });
        group.init().addTo();
        if (bone.cubes) {
          bone.cubes.forEach((cube_data) => {
            const size = cube_data.size || [1, 1, 1];
            const cube = new Cube({
              name: bone.name + "_cube",
              from: cube_data.origin || [0, 0, 0],
              to: [
                (cube_data.origin?.[0] || 0) + size[0],
                (cube_data.origin?.[1] || 0) + size[1],
                (cube_data.origin?.[2] || 0) + size[2],
              ],
              origin: cube_data.pivot || [0, 0, 0],
              rotation: cube_data.rotation || [0, 0, 0],
            });
            cube.addTo(group);
          });
        }
      });
    }
  },
});

// ── Format Definition ─────────────────────────────────────────────────────────
const blockent_format = new ModelFormat({
  id: "blockent",
  name: "BlockEnt",
  description: "Bedrock Block + Entity gabungan: model, texture, display, animasi",
  category: "minecraft",
  target: ["Minecraft: Bedrock Edition"],
  icon: "extension",
  show_on_start_screen: true,
  box_uv: true,
  optional_box_uv: true,
  single_texture: false,
  model_identifier: true,
  bone_rig: true,
  centered_grid: true,
  rotate_cubes: true,
  integer_size: false,
  meshes: false,
  texture_meshes: false,
  locators: false,
  canvas_limit: false,
  rotation_limit: false,
  uv_rotation: true,
  java_face_properties: false,
  select_texture_for_particles: false,
  codec: blockent_codec,

  onActivation() {
    MenuBar.addAction(display_action, "tools");
    MenuBar.addAction(animation_panel_action, "tools");
  },
  onDeactivation() {
    MenuBar.removeAction("tools.blockent_display");
    MenuBar.removeAction("tools.blockent_animation");
  },
});

// ── Display Settings Helper ───────────────────────────────────────────────────
function getDisplaySettings() {
  return (
    Project._blockent_display || {
      thirdperson_righthand: {
        rotation: [75, 45, 0],
        translation: [0, 2.5, 0],
        scale: [0.375, 0.375, 0.375],
      },
      thirdperson_lefthand: {
        rotation: [75, 45, 0],
        translation: [0, 2.5, 0],
        scale: [0.375, 0.375, 0.375],
      },
      firstperson_righthand: {
        rotation: [0, 45, 0],
        scale: [0.4, 0.4, 0.4],
      },
      firstperson_lefthand: {
        rotation: [0, 225, 0],
        scale: [0.4, 0.4, 0.4],
      },
      ground: {
        translation: [0, 3, 0],
        scale: [0.25, 0.25, 0.25],
      },
      gui: {
        rotation: [30, 225, 0],
        scale: [0.625, 0.625, 0.625],
      },
      head: {
        translation: [0, -7, 0],
      },
      fixed: {
        scale: [0.5, 0.5, 0.5],
      },
    }
  );
}

function getAnimationExport() {
  return Project._blockent_animations || {};
}

// ── Display Panel UI ──────────────────────────────────────────────────────────
const DISPLAY_SLOTS = [
  "thirdperson_righthand",
  "thirdperson_lefthand",
  "firstperson_righthand",
  "firstperson_lefthand",
  "ground",
  "gui",
  "head",
  "fixed",
];

const SLOT_LABELS = {
  thirdperson_righthand: "Third Person Right Hand",
  thirdperson_lefthand: "Third Person Left Hand",
  firstperson_righthand: "First Person Right Hand",
  firstperson_lefthand: "First Person Left Hand",
  ground: "Ground",
  gui: "GUI",
  head: "Head",
  fixed: "Item Frame",
};

function openDisplayDialog() {
  if (!Project) {
    Blockbench.showQuickMessage("Tidak ada project aktif", 2000);
    return;
  }
  if (!Project._blockent_display) {
    Project._blockent_display = getDisplaySettings();
  }
  const disp = Project._blockent_display;

  // Build form fields
  const form = {};
  DISPLAY_SLOTS.forEach((slot) => {
    const d = disp[slot] || {};
    const r = d.rotation || [0, 0, 0];
    const t = d.translation || [0, 0, 0];
    const s = d.scale || [1, 1, 1];
    form[`${slot}_label`] = {
      type: "info",
      text: `──── ${SLOT_LABELS[slot]} ────`,
    };
    form[`${slot}_rx`] = {
      label: "Rotation X",
      type: "number",
      value: r[0],
    };
    form[`${slot}_ry`] = {
      label: "Rotation Y",
      type: "number",
      value: r[1],
    };
    form[`${slot}_rz`] = {
      label: "Rotation Z",
      type: "number",
      value: r[2],
    };
    form[`${slot}_tx`] = {
      label: "Translation X",
      type: "number",
      value: t[0],
    };
    form[`${slot}_ty`] = {
      label: "Translation Y",
      type: "number",
      value: t[1],
    };
    form[`${slot}_tz`] = {
      label: "Translation Z",
      type: "number",
      value: t[2],
    };
    form[`${slot}_sx`] = { label: "Scale X", type: "number", value: s[0] };
    form[`${slot}_sy`] = { label: "Scale Y", type: "number", value: s[1] };
    form[`${slot}_sz`] = { label: "Scale Z", type: "number", value: s[2] };
  });

  new Dialog({
    id: "blockent_display",
    title: "BlockEnt – Display Settings",
    width: 480,
    form,
    onConfirm(result) {
      DISPLAY_SLOTS.forEach((slot) => {
        disp[slot] = {
          rotation: [
            result[`${slot}_rx`] || 0,
            result[`${slot}_ry`] || 0,
            result[`${slot}_rz`] || 0,
          ],
          translation: [
            result[`${slot}_tx`] || 0,
            result[`${slot}_ty`] || 0,
            result[`${slot}_tz`] || 0,
          ],
          scale: [
            result[`${slot}_sx`] || 1,
            result[`${slot}_sy`] || 1,
            result[`${slot}_sz`] || 1,
          ],
        };
      });
      Project._blockent_display = disp;
      Blockbench.showQuickMessage("Display settings disimpan ✓", 1500);
    },
  }).show();
}

// ── Animation Manager UI ──────────────────────────────────────────────────────
function openAnimationDialog() {
  if (!Project) {
    Blockbench.showQuickMessage("Tidak ada project aktif", 2000);
    return;
  }
  if (!Project._blockent_animations) {
    Project._blockent_animations = {};
  }
  const anims = Project._blockent_animations;
  const animKeys = Object.keys(anims);

  const listHtml =
    animKeys.length === 0
      ? "<p style='opacity:.5'>Belum ada animasi</p>"
      : animKeys
          .map(
            (k) =>
              `<div class="blockent-anim-item" style="padding:4px 0;border-bottom:1px solid #333">
            <b>${k}</b> — loop: ${anims[k].loop || false}, length: ${anims[k].animation_length || "auto"}
          </div>`
          )
          .join("");

  new Dialog({
    id: "blockent_anim_manager",
    title: "BlockEnt – Animation Manager",
    width: 520,
    lines: [
      `<div style="padding:8px 0">
        <h3 style="margin:0 0 8px">Animasi Tersimpan</h3>
        <div>${listHtml}</div>
      </div>`,
    ],
    form: {
      anim_name: { label: "Nama Animasi", type: "text", value: "animation.blockent.idle" },
      anim_loop: { label: "Loop", type: "checkbox", value: true },
      anim_length: { label: "Panjang (detik, 0 = auto)", type: "number", value: 0 },
      info_bones: {
        type: "info",
        text: "Bone keyframes diambil dari timeline Blockbench saat ini",
      },
    },
    buttons: ["Tambah Animasi", "Hapus Terpilih", "Tutup"],
    onButton(index, result) {
      if (index === 0) {
        // Tambah
        const name = result.anim_name || "animation.blockent.new";
        const boneData = {};
        // Collect keyframes dari Animator jika ada
        if (window.Animator && Animator.animations) {
          Animator.animations.forEach((anim) => {
            anim.animators && Object.keys(anim.animators).forEach((boneName) => {
              const animator = anim.animators[boneName];
              const kfData = {};
              ["rotation", "position", "scale"].forEach((channel) => {
                if (animator[channel] && animator[channel].length) {
                  kfData[channel] = {};
                  animator[channel].forEach((kf) => {
                    kfData[channel][kf.time] = kf.data_points?.[0] || [0,0,0];
                  });
                }
              });
              if (Object.keys(kfData).length) boneData[boneName] = kfData;
            });
          });
        }
        anims[name] = {
          loop: result.anim_loop,
          animation_length: result.anim_length > 0 ? result.anim_length : undefined,
          bones: boneData,
        };
        Project._blockent_animations = anims;
        Blockbench.showQuickMessage(`Animasi "${name}" ditambahkan ✓`, 1500);
        this.hide();
        openAnimationDialog();
      } else if (index === 1) {
        // Hapus
        const name = result.anim_name;
        if (anims[name]) {
          delete anims[name];
          Project._blockent_animations = anims;
          Blockbench.showQuickMessage(`Animasi "${name}" dihapus`, 1500);
          this.hide();
          openAnimationDialog();
        } else {
          Blockbench.showQuickMessage("Animasi tidak ditemukan", 1500);
        }
      }
    },
  }).show();
}

// ── Actions ───────────────────────────────────────────────────────────────────
const display_action = new Action("blockent_display", {
  name: "BlockEnt: Display Settings",
  description: "Atur display BlockEnt (posisi di tangan, GUI, ground, dll)",
  icon: "visibility",
  click() {
    openDisplayDialog();
  },
});

const animation_panel_action = new Action("blockent_animation", {
  name: "BlockEnt: Animation Manager",
  description: "Kelola animasi BlockEnt",
  icon: "movie",
  click() {
    openAnimationDialog();
  },
});

// ── New File Preset ───────────────────────────────────────────────────────────
new Action("blockent_new", {
  name: "BlockEnt: New Project",
  description: "Buat project BlockEnt baru",
  icon: "add_box",
  click() {
    const setup = () => {
      Project._blockent_display = getDisplaySettings();
      Project._blockent_animations = {};
      Project.texture_width = 16;
      Project.texture_height = 16;
      Canvas.updateAll();
      Blockbench.showQuickMessage("Project BlockEnt siap! ✓", 2000);
    };
    if (newProject(blockent_format)) {
      setTimeout(setup, 300);
    }
  },
});

// ── Plugin Registration ───────────────────────────────────────────────────────
BBPlugin.register(PLUGIN_ID, {
  title: PLUGIN_NAME,
  author: "Rafi",
  description:
    "Gabungan Bedrock Block + Bedrock Entity. Model & texture seperti biasa, plus Display Settings dan Animation Manager.",
  icon: "extension",
  version: PLUGIN_VERSION,
  min_version: "5.1.0",
  variant: "both",

  onload() {
    // Toolbar shortcut di menu Tools
    MenuBar.addAction(display_action, "tools");
    MenuBar.addAction(animation_panel_action, "tools");

    // Tambah ke menu File > New
    MenuBar.addAction(
      new Action("blockent_new_menu", {
        name: "BlockEnt Project",
        description: "Buat project BlockEnt baru",
        icon: "add_box",
        click() {
          const setup = () => {
            Project._blockent_display = getDisplaySettings();
            Project._blockent_animations = {};
            Canvas.updateAll();
            Blockbench.showQuickMessage("Project BlockEnt siap! ✓", 2000);
          };
          if (newProject(blockent_format)) setTimeout(setup, 300);
        },
      }),
      "file.new"
    );

    console.log(`[${PLUGIN_NAME}] v${PLUGIN_VERSION} loaded`);
  },

  onunload() {
    blockent_format.delete();
    blockent_codec.delete();
    display_action.delete();
    animation_panel_action.delete();
    console.log(`[${PLUGIN_NAME}] unloaded`);
  },
});

})();
