const moduleID = 'attunement-tracking';

const lg = x => console.log(x);


Hooks.once('init', () => {
    libWrapper.register(moduleID, 'CONFIG.Actor.documentClass.prototype._prepareCharacterData', new_prepareCharacterData, 'WRAPPER');
});


Hooks.on('renderItemSheet5e', (app, [html], appData) => {
    const item = app.object;
    let attunementDiv = html.querySelector('select[name="system.attunement"]')?.closest('div.form-group');
    if (!attunementDiv) attunementDiv = html.querySelector('select[data-tidy-field="system.attunement"]').closest('div');
    if (!attunementDiv) return;

    const attunementInput = document.createElement('div');
    attunementInput.classList.add('form-group');
    attunementInput.innerHTML = `
        <label>Attunement Level</label>
        <div class="form-fields">
            <input type="number" value="${item.getFlag(moduleID, 'attunementValue') || 0}" name="flags.${moduleID}.attunementValue" />
        </div>
    `;

    attunementDiv.after(attunementInput);
});

Hooks.on('preUpdateItem', (item, diff, options, userID) => {
    const { actor } = item;
    if (!actor) return;

    if (
        !(moduleID in (diff.flags || {}))
        && !('attunement' in (diff.system || {}))
    ) return;

    const { value: currentActorAttunementValue, max: actorAttunementMax } = actor.system.attributes.attunement;
    const isNewlyAttuned = diff.system?.attunement === CONFIG.DND5E.attunementTypes.ATTUNED;
    const oldAttunementValue = item.getFlag(moduleID, 'attunementValue');
    const attunementValue = diff.flags?.[moduleID]?.attunementValue ?? oldAttunementValue;
    if (isNewlyAttuned || moduleID in (diff.flags || {})) {
        const newActorAttunementLevel = currentActorAttunementValue + attunementValue - (isNewlyAttuned ? 0 : oldAttunementValue);
        if (
            (item.system.attunement === 2 || diff.system?.attunement === 2)
            && (newActorAttunementLevel > actorAttunementMax)
        ) {
            ui.notifications.warn('Total attunement value exceeds maximum.');
            delete diff.system?.attunement;
            delete diff.flags?.[moduleID];
            return;
        }
    }
});


function new_prepareCharacterData(wrapped) {
    wrapped();

    this.system.attributes.attunement.value = 0;
    this.system.attributes.attunement.max = this.system.details.level;
    for (const item of this.items) {
        if (item.system.attunement === CONFIG.DND5E.attunementTypes.ATTUNED) {
            this.system.attributes.attunement.value += item.getFlag(moduleID, 'attunementValue') ?? 0;
        }
    }
}
