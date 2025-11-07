export async function rollSkillTestUnder(actor, totalRank, rollLabel) {
  let formula = `2d6`;
  const roll = await new Roll(formula).roll();
  let dieResult = roll.total;

  rollLabel += " (Roll Under)";

  let style = "";
  let isSuccess = false;

  if (roll.total <= totalRank) {
    style = "color: green";
    isSuccess = true;
  } else {
    style = "color: red";
  }

  let html = "";

  html = `<div class="dice-roll">`;
  html += `     <div class="dice-result">`;
  html += `     <div class="dice-formula"><i class="fa-solid fa-crosshairs-simple"></i> ${totalRank}</div>`;
  html += `     <div class="dice-tooltip">`;
  html += `          <section class="tooltip-part">`;
  html += `               <div class="dice">`;
  html += `                    <header class="part-header flexrow">`;
  html += `                       <span class="part-formula">2d6</span>`;
  html += `                       <span class="part-total">${roll.total}</span>`;
  html += `                    </header>`;
  html += `                    <ol class="dice-rolls">`;
  html += `                         <li class="roll die d6 ${dieResult === 1 ? "max" : ""} ${dieResult === 6 ? "min" : ""}">${roll.terms[0].results[0].result}</li>`;
  html += `                         <li class="roll die d6 ${dieResult === 1 ? "max" : ""} ${dieResult === 6 ? "min" : ""}">${roll.terms[0].results[1].result}</li>`;
  html += `                    </ol>`;
  html += `               </div>`;
  html += `          </section>`;
  html += `     </div>`;
  html += `     <h4 class="dice-total" style="${style}">${roll.total} ${isSuccess ? '<i class="fa-solid fa-check"></i>' : '<i class="fa-solid fa-xmark"></i>'}</h4>`;
  html += `</div>`;

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    content: html,
    flavor: rollLabel,
  });

  return roll.total;
}

export async function rollSkillTestOver(actor, totalRank, rollLabel) {
  let formula = `2d6+${totalRank}`;
  const roll = await new Roll(formula).roll();
  rollLabel += " (Roll Against)";

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    flavor: rollLabel,
  });

  return roll.total;
}

export async function showSkillTestDialog(actor, totalRank, rollLabel) {
  let rollValue;
  try {
    const result = await Dialog.wait({
      title: rollLabel,
      default: "roll",
      buttons: {
        rollUnder: {
          label: "Roll Under",
        },
        rollOver: {
          label: "Roll Over",
        },
      },
    });
    if (result === "rollUnder") {
      rollValue = await rollSkillTestUnder(actor, totalRank, rollLabel);
    } else if (result === "rollOver") {
      rollValue = await rollSkillTestOver(actor, totalRank, rollLabel);
    }
  } catch {
    // Dialog closed. Fine.
  }
  return rollValue;
}

export async function simpleRoll(actor, formula, formulaLabel) {
  const roll = await new Roll(formula).roll();

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    flavor: formulaLabel,
  });

  return roll.total;
}
