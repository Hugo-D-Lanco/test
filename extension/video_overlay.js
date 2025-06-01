window.Twitch.ext.onAuthorized(auth => {
  console.log('Authorized:', auth);
  window.Twitch.ext.configuration.onChanged(() => {
    console.log('Configuration changed');
    const config = window.Twitch.ext.configuration.broadcaster;
    if (config) {
      try {
        const team = JSON.parse(config.content);
        console.log('Loaded team:', team);
        renderTeam(team);
      } catch (error) {
        console.error('Error parsing configuration:', error);
      }
    } else {
      console.log('No configuration found');
    }
  });
});

window.Twitch.ext.onError = (error) => console.error('Twitch Extension Error:', error);

function getNormalSprite(species) {
  return 'resources/icons/placeholder.webp';
}

function getIconSprite(species) {
  const speciesKey = species.toLowerCase().replace(/\s+/g, '-');
  return `resources/icons/${speciesKey}.webp`;
}

function getTooltipSprite(species) {
  return getIconSprite(species);
}

function getItemSprite(item) {
  if (!item) return 'resources/items/placeholder.webp';
  const itemKey = item.toLowerCase().replace(/\s+/g, '-');
  return `resources/items/${itemKey}.webp`;
}

function getTeraTypeIcon(teraType) {
  if (!teraType) return '';
  return `resources/Tera/${teraType.toLowerCase()}.webp`;
}

async function renderTeam(team) {
  const teamColumn = document.getElementById('team-column');
  if (!teamColumn) {
    console.error('Team column element not found');
    return;
  }

  teamColumn.innerHTML = '';

  if (!team || team.length === 0) {
    console.log('No team data to render');
    return;
  }

  for (const pokemon of team) {
    const iconSpriteUrl = getIconSprite(pokemon.species);
    const tooltipSpriteUrl = getTooltipSprite(pokemon.species);
    const itemSpriteUrl = pokemon.item ? getItemSprite(pokemon.item) : null;
    const teraTypeIconUrl = pokemon.teraType ? getTeraTypeIcon(pokemon.teraType) : '';

    const pokemonDiv = document.createElement('div');
    pokemonDiv.className = 'pokemon-entry';
    pokemonDiv.innerHTML = `
      <img src="${iconSpriteUrl}" alt="${pokemon.species}" onerror="this.src='${getNormalSprite(pokemon.species)}'">
      <span>${pokemon.nickname || pokemon.species}${pokemon.gender ? ' (' + pokemon.gender + ')' : ''}</span>
      <div class="tooltip">
        <div class="header">
          <img src="${tooltipSpriteUrl}" alt="${pokemon.species}" class="sprite" onerror="this.src='${getNormalSprite(pokemon.species)}'">
        </div>
        <div class="details">
          <div class="name-line">
            ${itemSpriteUrl ? `<img src="${itemSpriteUrl}" alt="${pokemon.item}" class="item" onerror="this.src='resources/items/placeholder.webp'">` : ''}
            <span>${pokemon.nickname || pokemon.species}${pokemon.gender ? ' (' + pokemon.gender + ')' : ''}${pokemon.item ? ' @ ' + pokemon.item : ''}</span>
          </div>
          ${pokemon.ability ? `<div>Ability: ${pokemon.ability}</div>` : ''}
          ${pokemon.level ? `<div>Level: ${pokemon.level}</div>` : ''}
          ${pokemon.teraType ? `<div>Tera Type: ${teraTypeIconUrl ? `<img src="${teraTypeIconUrl}" alt="${pokemon.teraType} Tera Type" class="tera-icon" onerror="this.src='resources/Tera/placeholder.webp'">` : 'None'}</div>` : ''}
          ${pokemon.shiny === 'Yes' ? `<div>Shiny: Yes</div>` : ''}
          ${pokemon.evs ? `<div>EVs: ${pokemon.evs}</div>` : ''}
          ${pokemon.ivs ? `<div>IVs: ${pokemon.ivs}</div>` : ''}
          ${pokemon.nature ? `<div>${pokemon.nature} Nature</div>` : ''}
          <div class="moves">
            ${pokemon.moves && pokemon.moves.length ? pokemon.moves.map(move => `<div>${move}</div>`).join('') : '<div>- None</div>'}
          </div>
        </div>
      </div>
    `;

    // Add event listeners for tooltip positioning
    pokemonDiv.addEventListener('mouseenter', (event) => {
      const tooltip = pokemonDiv.querySelector('.tooltip');
      tooltip.style.display = 'block';

      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const entryRect = pokemonDiv.getBoundingClientRect();

      let topPosition = 0;
      if (entryRect.top + tooltipRect.height > viewportHeight) {
        topPosition = - (tooltipRect.height - entryRect.height);
      }
      if (entryRect.top + topPosition < 0) {
        topPosition = -entryRect.top;
      }
      tooltip.style.top = `${topPosition}px`;
    });

    pokemonDiv.addEventListener('mouseleave', () => {
      const tooltip = pokemonDiv.querySelector('.tooltip');
      tooltip.style.display = 'none';
    });

    teamColumn.appendChild(pokemonDiv);
  }
}