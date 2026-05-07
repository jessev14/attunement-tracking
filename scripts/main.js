const moduleID = 'attunement-tracking';

const lg = x => console.log(x);


Hooks.once('init', () => {
    libWrapper.register(moduleID, 'CONFIG.Actor.documentClass.prototype.prepareData', new_prepareCharacterData, 'WRAPPER');
});


// Every time an actor renders, whether a full render or a partial
Hooks.on("renderItemSheetV2", (sheet, element, data) => {
    const item = sheet.object;
    const attunementValue = item.getFlag(moduleID, 'attunementValue')
    const isTidySheet = element.classList.contains('tidy5e-sheet');

    if (!isTidySheet) {
        return;
    }

    const usageFieldset = element.querySelector("input[data-tidy-field='system.uses.spent']").closest('fieldset');
    const attunementValueFieldset = usageFieldset.cloneNode(true);
    attunementValueFieldset.dataset.tidyRenderScheme = 'handlebars';
    attunementValueFieldset.querySelector('legend').innerText = 'Attunement ';

    const label = attunementValueFieldset.querySelector('label');
    label.for = '';
    label.innerText = 'Attunement Value';

    attunementValueFieldset.querySelector('div.form-group.label-top').remove();
    attunementValueFieldset.querySelector('div.label-top label').innerText = '';
    attunementValueFieldset.querySelector('div.label-top label').dataset.fieldPath = `flags.${moduleID}.attunementValue`;

    const input = attunementValueFieldset.querySelector('input');
    input.type = 'number';
    input.classList.add('attunement-value');
    delete input.dataset.tidyField;
    input.removeAttribute('id');

    usageFieldset.insertAdjacentHTML("afterend", attunementValueFieldset.outerHTML);
    element.querySelector('input.attunement-value').value = attunementValue;
    element.querySelector('input.attunement-value').addEventListener('change', function () {
        item.setFlag(moduleID, 'attunementValue', this.value)
    });
});

Hooks.on('renderItemSheet5e', (app, [html], appData) => {
    const item = app.object;
    let attunementDiv = html.querySelector('select[name="system.attunement"]')?.closest('div.form-group');
    if (!attunementDiv) attunementDiv = html.querySelector('select[data-tidy-field="system.attunement"]').closest('div');
    if (!attunementDiv) return;

    const attunementInput = document.createElement('div');
    attunementInput.classList.add('form-group');
    attunementInput.innerHTML = `


        <div class="form-group label-top">
            <label>Level</label>
            <div class="form-fields">
                <input type="number" value="${item.getFlag(moduleID, 'attunementValue') || 0}" name="flags.${moduleID}.attunementValue" />
            </div>
        </div>
    `;

    attunementDiv.after(attunementInput);
});

Hooks.on('preUpdateItem', (item, diff, options, userID) => {
    lg({ item, diff })
    const { actor } = item;
    if (!actor) return;

    const { value: currentActorAttunementValue, max: actorAttunementMax } = actor.system.attributes.attunement;

    const changeType = moduleID in (diff.flags || {}) ? 'attunementLevel' : 'attuned' in (diff.system || {}) ? 'attuned' : false;
    if (!changeType) return;

    if (changeType === 'attunementLevel') {
        const isAttuned = item.system.attuned;
        if (isAttuned) {
            const newAttunementLevel = currentActorAttunementValue - item.getFlag(moduleID, 'attunementValue') + diff.flags[moduleID].attunementValue;
            if (newAttunementLevel > actorAttunementMax) {
                ui.notifications.warn('Total attunement value exceeds maximum.');
                return false;
            }
        }
    }

    if (diff.system?.attuned) {
        const itemAttunementValue = item.getFlag(moduleID, 'attunementValue') || 0;
        const newattunementValue = currentActorAttunementValue + itemAttunementValue;
        if (newattunementValue > actorAttunementMax) {
            ui.notifications.warn('Total attunement value exceeds maximum.');
            return false;
        }
    }
});


function new_prepareCharacterData(wrapped) {
    wrapped();

    this.system.attributes.attunement.value = 0;
    this.system.attributes.attunement.max = this.system.details.level * 10;
    for (const item of this.items) {
        if (item.system.attuned) {
            this.system.attributes.attunement.value += item.getFlag(moduleID, 'attunementValue') ?? 0;
        }
    }
}
