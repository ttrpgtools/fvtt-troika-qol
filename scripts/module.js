import {
  rollSkillTestUnder,
  simpleRoll,
  showSkillTestDialog,
  rollSkillTestOver,
} from "./roll.js";
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
const LUCK_PROP = "system.luck.value";
const LUCK_MAX = "system.luck.max";
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
const SPELL_COST = /\((\d+)\)$/;

function increateStat(actor, prop, maxprop, inc) {
  const current = foundry.utils.getProperty(actor, prop);
  const max = foundry.utils.getProperty(actor, maxprop);
  const newValue = clamp(0, current + inc, max);
  actor.update({ [prop]: newValue });
}

Hooks.on("renderTroikaActorSheet", async function (app, html, data) {
  const luck = html.find('[data-roll-label="Test Luck"]');
  const luckParent = luck.parent();
  const refresher = $(
    '<i class="fas fa-bed rollable-skill-test" style="margin-left: 8px;"></i>',
  );
  luckParent.append(refresher);
  refresher.on("click", async () => {
    const inc = await simpleRoll(data.actor, "2d6", "Luck Recovery");
    increateStat(data.actor, LUCK_PROP, LUCK_MAX, inc);
  });
  luck.off("click");
  luck.on("click", (ev) => {
    const el = $(ev.currentTarget);
    let rankTotal = el.data("roll-total");
    let rollLabel = el.data("roll-label");
    rollSkillTestUnder(data.actor, rankTotal, rollLabel);
    const newLuck = parseInt(rankTotal, 10) - 1;
    data.actor.update({ [LUCK_PROP]: newLuck });
  });
  const itemslist = html.find(".items-list .rollable-skill-test");
  itemslist.off("click");
  itemslist.on("click", async (ev) => {
    const el = $(ev.currentTarget);
    let rankTotal = el.data("roll-total");
    let rollLabel = el.data("roll-label");
    let result;
    if (ev && ev.shiftKey) {
      result = await rollSkillTestUnder(data.actor, rankTotal, rollLabel);
    } else if (ev && ev.ctrlKey) {
      result = await rollSkillTestOver(data.actor, rankTotal, rollLabel);
    } else {
      result = await showSkillTestDialog(data.actor, rankTotal, rollLabel);
    }
    const res = SPELL_COST.exec(ev.currentTarget.textContent.trim());
    if (res && result != null) {
      const cost = parseInt(res[1], 10);
      console.log("MAGIC ITEM", cost);
      const current = foundry.utils.getProperty(data.actor, STAMINA_PROP);
      const newValue = Math.max(0, current - cost);
      data.actor.update({ [STAMINA_PROP]: newValue });
    }
  });
  const provhead = html.find(".monies-provisions-grid h3").last();
  provhead.css("grid-template-columns", "1fr 2rem 2rem");
  const eat = $(
    '<i class="fas fa-cookie-bite rollable-skill-test" style="justify-self: right;"></i>',
  );
  const sleep = $(
    '<i class="fas fa-bed rollable-skill-test" style="justify-self: right;"></i>',
  );
  provhead.append(eat);
  provhead.append(sleep);
  eat.on("click", async () => {
    const inc = await simpleRoll(data.actor, "1d6", "Eat Provision");
    increateStat(data.actor, STAMINA_PROP, STAMINA_MAX, inc);
  });
  sleep.on("click", async () => {
    const inc = await simpleRoll(data.actor, "2d6", "Rest (Stamina)");
    increateStat(data.actor, STAMINA_PROP, STAMINA_MAX, inc);
  });
});
