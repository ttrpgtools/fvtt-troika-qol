const MODULE_NAME = "troika-qol";
const log = (...args) => console.log("TROIKA QoL |", ...args);

const clamp = (min, value, max) => Math.max(min, Math.min(max, value));

/**
 *
 * @param {HTMLElement} el
 */
function isPotentialDamageMessage(ellist) {
  const el = ellist[0];
  if (!el) return false;
  const hasTotal = el.querySelector(".dice-total") != null;
  const tokensControlled = game.canvas.tokens.controlled.length > 0;
  const flavor = el.querySelector(".flavor-text")?.textContent;
  const isSkillRoll =
    flavor?.includes("(Roll Against)") || flavor?.includes("(Roll Under)");
  return tokensControlled && hasTotal && !isSkillRoll;
}

const MIGHTY_DAMAGE = /\d+x2\s=\s(\d+)/;
const STAMINA_PROP = "system.stamina.value";
const STAMINA_MAX = "system.stamina.max";
function applyDamageToActiveActor(ellist, factor) {
  const el = ellist[0];
  if (!el) return false;
  const result = el.querySelector(".dice-total")?.textContent?.trim();
  const mightyMatch = MIGHTY_DAMAGE.exec(result);
  const damage = mightyMatch ? Number(mightyMatch[1]) : Number(result);
  if (Number.isNaN(damage) || damage === 0) return;
  const controlled = game.canvas.tokens.controlled;
  for (const t of controlled) {
    const a = t instanceof Token ? t.actor : t;
    if (!a.isOwner) {
      ui.notifications.warn(
        game.i18n.format("TroikaQoL.NoOwner", { name: a.name || "current" }),
      );
      continue;
    }
    const current = foundry.utils.getProperty(a, STAMINA_PROP);
    const max = foundry.utils.getProperty(a, STAMINA_MAX);
    const newValue = clamp(0, current - damage * factor, max);
    a.update({ [STAMINA_PROP]: newValue });
  }
}

function addChatContextMenuItems(entries) {
  const menuId = MODULE_NAME;
  if (entries.some((e) => e.menuId === menuId)) {
    return;
  }
  // Add entries at the top.
  entries.unshift(
    {
      menuId,
      name: game.i18n.localize("TroikaQoL.ApplyDamage"),
      icon: '<i class="fas fa-heart-circle-minus"></i>',
      condition: isPotentialDamageMessage,
      callback: (x) => applyDamageToActiveActor(x, 1),
    },
    {
      name: game.i18n.localize("TroikaQoL.ApplyHealing"),
      icon: '<i class="fas fa-heart-circle-plus"></i>',
      condition: isPotentialDamageMessage,
      callback: (x) => applyDamageToActiveActor(x, -1),
    },
  );
}

Hooks.on("getChatMessageContextOptions", async function (_, entries) {
  log("getChatMessageContextOptions - Initializing");
  addChatContextMenuItems(entries);
});

Hooks.on("getChatLogEntryContext", async function (_, entries) {
  log("getChatLogEntryContext - Initializing");
  addChatContextMenuItems(entries);
});
