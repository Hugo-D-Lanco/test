// Ensure buttons have event listeners attached after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const previewButton = document.getElementById('previewButton');
  const saveButton = document.getElementById('saveButton');

  if (previewButton) {
    previewButton.addEventListener('click', previewTeam);
  } else {
    console.error('Preview button not found in the DOM');
  }

  if (saveButton) {
    saveButton.addEventListener('click', saveTeam);
  } else {
    console.error('Save button not found in the DOM');
  }
});

function parseShowdownTeam(teamText) {
  const team = [];
  const errors = [];
  const pokemonEntries = teamText.replace(/\r\n/g, '\n').split(/\n{2,}/).map(entry => entry.trim()).filter(entry => entry);

  for (const [index, entry] of pokemonEntries.entries()) {
    const lines = entry.split('\n').filter(line => line.trim());
    if (!lines.length) {
      errors.push(`Entry ${index + 1}: Empty or invalid entry.`);
      continue;
    }

    const pokemon = {};
    const [namePart = '', itemPart = ''] = lines[0].split(/\s*@\s*/);
    pokemon.item = itemPart.trim() || '';

    const parenMatches = namePart.match(/\([^()]*\)/g) || [];
    const parenCount = parenMatches.length;

    if (parenCount === 2) {
      const match = namePart.match(/^(.+?)\s*\(([^()]+)\)\s*\(([MF])\)$/);
      if (match) {
        pokemon.nickname = match[1].trim();
        pokemon.species = match[2].trim();
        pokemon.gender = match[3];
      } else {
        errors.push(`Entry ${index + 1}: Invalid first line: "${lines[0]}". Expected "nickname (species) (M/F)".`);
        continue;
      }
    } else if (parenCount === 1) {
      const match = namePart.match(/^(.+?)\s*\(([^()]+)\)$/);
      if (match) {
        const firstPart = match[1].trim();
        const parenContent = match[2].trim();
        if (parenContent === 'M' || parenContent === 'F') {
          pokemon.species = firstPart;
          pokemon.gender = parenContent;
        } else {
          pokemon.nickname = firstPart;
          pokemon.species = parenContent;
          pokemon.gender = '';
        }
      } else {
        errors.push(`Entry ${index + 1}: Invalid first line: "${lines[0]}". Expected "species (M/F)" or "nickname (species)".`);
        continue;
      }
    } else {
      pokemon.species = namePart.trim();
      pokemon.gender = '';
    }

    if (!pokemon.species) {
      errors.push(`Entry ${index + 1}: No valid species found in: "${lines[0]}".`);
      continue;
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Ability: ')) {
        pokemon.ability = line.replace('Ability: ', '').trim();
      } else if (line.startsWith('EVs: ')) {
        pokemon.evs = line.replace('EVs: ', '').trim();
      } else if (line.includes(' Nature')) {
        pokemon.nature = line.replace(' Nature', '').trim();
      } else if (line.startsWith('IVs: ')) {
        pokemon.ivs = line.replace('IVs: ', '').trim();
      } else if (line.startsWith('Level: ')) {
        pokemon.level = line.replace('Level: ', '').trim();
      } else if (line.startsWith('Tera Type: ')) {
        pokemon.teraType = line.replace('Tera Type: ', '').trim();
      } else if (line.startsWith('Shiny: ')) {
        pokemon.shiny = line.replace('Shiny: ', '').trim();
      } else if (line.startsWith('- ')) {
        if (!pokemon.moves) pokemon.moves = [];
        pokemon.moves.push(line.replace('- ', '').trim());
      } else {
        errors.push(`Entry ${index + 1}: Unrecognized line: "${line}".`);
      }
    }

    team.push(pokemon);
  }

  return { team, errors };
}

function getNormalSprite(species) {
  return 'resources/icons/placeholder.webp'; // Ensure you have a placeholder.webp in resources/icons/
}

function getIconSprite(species) {
  const speciesKey = species.toLowerCase().replace(/\s+/g, '-');
  return `resources/icons/${speciesKey}.webp`;
}

function getTooltipSprite(species) {
  // Using the same icon sprite as getIconSprite(), just scaled larger in the tooltip
  return getIconSprite(species);
}

function getItemSprite(item) {
  if (!item) return 'resources/items/placeholder.webp'; // Ensure you have a placeholder.webp in resources/items/
  const itemKey = item.toLowerCase().replace(/\s+/g, '-');
  return `resources/items/${itemKey}.webp`;
}

function getTeraTypeIcon(teraType) {
  if (!teraType) return '';
  return `resources/Tera/${teraType.toLowerCase()}.webp`;
}

async function renderTeam(team) {
  const teamColumn = document.getElementById('team-column');
  const errorMessage = document.getElementById('error-message');
  if (!teamColumn || !errorMessage) {
    console.error('Team column or error message element not found');
    return;
  }

  teamColumn.innerHTML = '';
  errorMessage.textContent = '';

  if (!team || team.length === 0) {
    errorMessage.textContent = 'No valid Pokémon found in the input.';
    return;
  }

  const spriteErrors = [];

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

  if (spriteErrors.length > 0) {
    errorMessage.textContent += `\nSprite Errors:\n${spriteErrors.join('\n')}`;
  }
}

async function previewTeam() {
  console.log('Preview Team button clicked');
  const teamText = document.getElementById('teamInput').value;
  const errorMessage = document.getElementById('error-message');
  if (!teamText) {
    errorMessage.textContent = 'Please enter a team to preview.';
    return;
  }

  try {
    const { team, errors } = parseShowdownTeam(teamText);
    console.log('Parsed team:', team);
    await renderTeam(team);
    errorMessage.textContent = errors.length > 0 ? errors.join('\n') : '';
  } catch (error) {
    console.error('Error in previewTeam:', error);
    errorMessage.textContent = 'Error parsing team: ' + error.message;
  }
}

function saveTeam() {
  console.log('Save Team button clicked');
  const teamText = document.getElementById('teamInput').value;
  const errorMessage = document.getElementById('error-message');
  if (!teamText) {
    errorMessage.textContent = 'Please enter a team to save.';
    return;
  }

  try {
    const { team, errors } = parseShowdownTeam(teamText);
    if (team.length === 0) {
      errorMessage.textContent = 'No valid Pokémon found to save.\n' + errors.join('\n');
      return;
    }
    if (window.Twitch && window.Twitch.ext) {
      window.Twitch.ext.configuration.set('broadcaster', '1', JSON.stringify(team));
      errorMessage.textContent = 'Team saved successfully!\n' + (errors.length > 0 ? errors.join('\n') : '');
    } else {
      console.log('Twitch.ext not available, logging team:', team);
      errorMessage.textContent = 'Team parsed successfully (Twitch save skipped in local testing).\n' + (errors.length > 0 ? errors.join('\n') : '');
    }
  } catch (error) {
    console.error('Error in saveTeam:', error);
    errorMessage.textContent = 'Error saving team: ' + error.message;
  }
}

// Initialize Twitch Extension
window.Twitch = window.Twitch || { ext: { configuration: { onChanged: () => {} } } };
window.Twitch.ext.onAuthorized = window.Twitch.ext.onAuthorized || (auth => console.log('Authorized:', auth));
window.Twitch.ext.onError = (error) => console.error('Twitch Extension Error:', error);