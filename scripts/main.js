const moduleID = 'attunement-tracking';

const lg = x => console.log(x);


Hooks.once('init', () => {
    libWrapper.register(moduleID, 'CONFIG.Actor.documentClass.prototype.prepareData', new_prepareCharacterData, 'WRAPPER');
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
    
    if (diff.system.attuned) {
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
