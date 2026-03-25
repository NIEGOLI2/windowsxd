// Shared weapon & Minecraft texture assets.

export const gunImg = new Image();
gunImg.src = './Item_Glock-sharedassets4.assets-616.webp';

export const mcImgs = {};
const mcPaths = {
  mc_sand: './sand.webp',
  mc_diamond_ore: './Diamond ore block.jpeg',
  mc_emerald_ore: './Emerald_Ore_29_JE4_BE3.webp',
  mc_leaves: './minecraft leafs.png',
  mc_portal: './portal.gif',
  mc_log: './log.jpg',
  mc_bedrock: './bedrock texture.webp',
  mc_stone_block: './Minecraft-Stone-Block.jpg',
  mc_cobblestone: './cobblestone.jpg',
  mc_lava: './lava.webp',
  mc_planks: './planks.png',
  mc_sponge: './sponge (1).jpg',
  mc_redwool: './redwool.jpg',
  mc_darkblue_wool: './dark blue wool (1).png',
  mc_rainbow_wool: './Rainbow_Wool_29.webp',
  mc_netherrack: './netherrack.jpg',
  mc_gold: './goldblock.jpg',
  mc_red_ore: './636990702005422084.png',
  mc_teal_gem: './Diamond.png',
  mc_crafting: './craftingtablefront.jpg',
  mc_tnt: './18c93372d05d50b.png'
};

Object.entries(mcPaths).forEach(([k, v]) => {
  mcImgs[k] = new Image();
  mcImgs[k].src = v;
});