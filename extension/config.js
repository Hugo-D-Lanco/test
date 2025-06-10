// Global flags
let rendering = false;
let debounceTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  const previewButton = document.getElementById('previewButton');
  const saveButton = document.getElementById('saveButton');
  const teamInput = document.getElementById('teamInput');
  const errorMessage = document.getElementById('error-message');
  const teamPrevTitle = document.getElementById('team_prev_title');
  const teamOrientation = document.getElementById('team-orientation');

  if (!previewButton || !saveButton || !teamInput || !errorMessage || !teamPrevTitle || !teamOrientation) {
    console.error('Required DOM elements not found:', {
      previewButton: !!previewButton,
      saveButton: !!saveButton,
      teamInput: !!teamInput,
      errorMessage: !!errorMessage,
      teamPrevTitle: !!teamPrevTitle,
      teamOrientation: !!teamOrientation
    });
    if (errorMessage) {
      errorMessage.textContent = 'Error: Required UI elements are missing.';
    }
    return;
  }

  previewButton.addEventListener('click', previewTeam);
  saveButton.addEventListener('click', saveTeam);

  // Load saved orientation
  const savedOrientation = localStorage.getItem('teamOrientation') || 'vertical';
  teamOrientation.checked = savedOrientation === 'horizontal';
  updateTeamColumnClass(savedOrientation);

  // Handle orientation toggle
  teamOrientation.addEventListener('change', () => {
    const orientation = teamOrientation.checked ? 'horizontal' : 'vertical';
    localStorage.setItem('teamOrientation', orientation);
    updateTeamColumnClass(orientation);
    renderTeam(JSON.parse(localStorage.getItem('lastTeam') || '[]')); // Re-render
  });

  function updateTeamColumnClass(orientation) {
    const teamColumn = document.getElementById('team-column');
    if (orientation === 'horizontal') {
      teamColumn.classList.add('horizontal');
    } else {
      teamColumn.classList.remove('horizontal');
    }
  }

  // Load saved configuration
  function loadConfiguration(attempt = 1, maxAttempts = 3) {
    if (!(window.Twitch && window.Twitch.ext && window.Twitch.ext.configuration)) {
      console.error('Twitch SDK not available');
      errorMessage.textContent = 'Twitch SDK not available.';
      return;
    }

    console.log(`Checking for saved configuration (attempt ${attempt})`);
    const savedConfig = window.Twitch.ext.configuration.broadcaster;
    if (savedConfig && savedConfig.content) {
      try {
        console.log('Loaded configuration:', savedConfig);
        const team = JSON.parse(savedConfig.content);
        console.log('Parsed saved team:', team, `Length: ${team.length}`);
        localStorage.setItem('lastTeam', JSON.stringify(team));
        renderTeam(team);
        teamInput.value = team.map(pokemon => {
          let entry = pokemon.nickname ? `${pokemon.nickname} (${pokemon.species})` : pokemon.species;
          if (pokemon.gender) entry += ` (${pokemon.gender})`;
          if (pokemon.item) entry += ` @ ${pokemon.item}`;
          entry += '\n';
          if (pokemon.ability) entry += `Ability: ${pokemon.ability}\n`;
          if (pokemon.level) entry += `Level: ${pokemon.level}\n`;
          if (pokemon.teraType) entry += `Tera Type: ${pokemon.teraType}\n`;
          if (pokemon.shiny) entry += `Shiny: ${pokemon.shiny}\n`;
          if (pokemon.evs) entry += `EVs: ${pokemon.evs}\n`;
          if (pokemon.ivs) entry += `IVs: ${pokemon.ivs}\n`;
          if (pokemon.nature) entry += `${pokemon.nature} Nature\n`;
          if (pokemon.moves && pokemon.moves.length) {
            entry += pokemon.moves.map(move => `- ${move}`).join('\n') + '\n';
          }
          return entry;
        }).join('\n');
        errorMessage.textContent = 'Loaded saved team successfully.';
        teamPrevTitle.textContent = 'Current Team';
      } catch (error) {
        console.error('Error loading saved configuration:', error);
        errorMessage.textContent = 'Error loading saved team: ' + error.message;
      }
    } else {
      console.log('No saved configuration found');
      if (attempt < maxAttempts) {
        console.log(`Retrying configuration load (attempt ${attempt + 1})`);
        setTimeout(() => loadConfiguration(attempt + 1, maxAttempts), 1000);
      } else {
        errorMessage.textContent = 'No saved team found.';
      }
    }
  }

  loadConfiguration();

  window.Twitch.ext.configuration.onChanged(() => {
    console.log('Configuration changed event received');
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      loadConfiguration();
    }, 500);
  });
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
        errors.push(`Entry ${index + 1}: Invalid first line: "${lines[0]}".`);
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
        errors.push(`Entry ${index + 1}: Invalid first line: "${lines[0]}".`);
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
  return 'resources/icons/placeholder.webp';
}

function getIconSprite(species) {
  try {
    const speciesKey = species.toLowerCase().replace(/\s+/g, '-');
    const url = `resources/icons/${speciesKey}.webp`;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => {
        console.error(`Failed to load sprite for ${species}: ${url}`);
        resolve(getNormalSprite(species));
      };
      img.src = url;
    });
  } catch (error) {
    console.error(`Error fetching icon sprite for ${species}:`, error);
    return getNormalSprite(species);
  }
}

function getItemSprite(item) {
  if (!item) return 'resources/items/placeholder.webp';
  try {
    const itemKey = item.toLowerCase().replace(/\s+/g, '-');
    const url = `resources/items/${itemKey}.webp`;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => {
        console.error(`Failed to load item sprite for ${item}: ${url}`);
        resolve('resources/items/placeholder.webp');
      };
      img.src = url;
    });
  } catch (error) {
    console.error(`Error fetching item sprite for ${item}:`, error);
    return 'resources/items/placeholder.webp';
  }
}

function getTeraTypeIcon(teraType) {
  if (!teraType) return '';
  try {
    const url = `resources/Tera/${teraType.toLowerCase()}.webp`;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => {
        console.error(`Failed to load Tera Type icon for ${teraType}: ${url}`);
        resolve('resources/Tera/normal.webp');
      };
      img.src = url;
    });
  } catch (error) {
    console.error(`Error fetching Tera Type icon for ${teraType}:`, error);
    return 'resources/Tera/normal.webp';
  }
}

async function renderTeam(team) {
  const teamColumn = document.getElementById('team-column');
  const errorMessage = document.getElementById('error-message');
  if (!teamColumn || !errorMessage) {
    console.error('Team column or error message element not found');
    errorMessage.textContent = 'Error: Team display area not found.';
    return;
  }

  if (rendering) {
    console.log('Render in progress, skipping redundant render');
    return;
  }
  rendering = true;

  console.log('Rendering team with length:', team ? team.length : 0);
  teamColumn.innerHTML = '';
  errorMessage.textContent = '';

  if (!team || team.length === 0) {
    errorMessage.textContent = 'No valid Pokémon found in the input.';
    rendering = false;
    return;
  }

  const spriteErrors = [];

  for (const pokemon of team) {
    const iconSpriteUrl = await getIconSprite(pokemon.species);
    const itemSpriteUrl = pokemon.item ? await getItemSprite(pokemon.item) : null;
    const teraTypeIconUrl = pokemon.teraType ? await getTeraTypeIcon(pokemon.teraType) : '';

    const pokemonDiv = document.createElement('div');
    pokemonDiv.className = 'pokemon-entry';
    pokemonDiv.innerHTML = `
      <img src="${iconSpriteUrl}" alt="${pokemon.species}">
      <span>${pokemon.nickname || pokemon.species}${pokemon.gender ? ' (' + pokemon.gender + ')' : ''}</span>
      <div class="tooltip">
        <div class="header">
          <img src="${iconSpriteUrl}" alt="${pokemon.species}" class="sprite">
        </div>
        <div class="details">
          <div class="name-line">
            <span>${pokemon.nickname || pokemon.species}${pokemon.gender ? ' (' + pokemon.gender + ')' : ''}${pokemon.item ? ' @ ' + pokemon.item : ''}</span>
            ${itemSpriteUrl ? `<img src="${itemSpriteUrl}" alt="${pokemon.item}" class="item">` : ''}
          </div>
          ${pokemon.ability ? `<div>Ability: ${pokemon.ability}</div>` : ''}
          ${pokemon.teraType ? `<div>Tera Type: ${teraTypeIconUrl ? `<img src="${teraTypeIconUrl}" alt="${pokemon.teraType} Tera Type" class="tera-icon">` : 'None'}</div>` : ''}
          ${pokemon.shiny === 'Yes' ? `<div>Shiny: Yes</div>` : ''}
          ${pokemon.evs ? `<div>EVs: ${pokemon.evs}</div>` : ''}
          ${pokemon.ivs ? `<div>IVs: ${pokemon.ivs}</div>` : ''}
          ${pokemon.nature ? `<div>${pokemon.nature} Nature</div>` : ''}
          <div class="moves">
            ${pokemon.moves && pokemon.moves.length ? pokemon.moves.map(move => `<div>- ${move}</div>`).join('') : '<div>- None</div>'}
          </div>
        </div>
      </div>
    `;

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

  rendering = false;
}

async function previewTeam() {
  console.log('Preview Team button clicked');
  const teamText = document.getElementById('teamInput').value;
  const errorMessage = document.getElementById('error-message');
  const teamPrevTitle = document.getElementById('team_prev_title');
  if (!teamText) {
    errorMessage.textContent = 'Please enter a team to preview.';
    teamPrevTitle.textContent = 'Team Preview';
    return;
  }

  try {
    const { team, errors } = parseShowdownTeam(teamText);
    console.log('Parsed team:', team, `Length: ${team.length}`);
    localStorage.setItem('lastTeam', JSON.stringify(team));
    await renderTeam(team);
    errorMessage.textContent = errors.length > 0 ? errors.join('\n') : '';
    teamPrevTitle.textContent = 'Preview Team';
  } catch (error) {
    console.error('Error in previewTeam:', error);
    errorMessage.textContent = 'Error parsing team: ' + error.message;
    teamPrevTitle.textContent = 'Team Preview';
  }
}

function saveTeam() {
  console.log('Save Team button clicked');
  const teamText = document.getElementById('teamInput').value;
  const errorMessage = document.getElementById('error-message');
  const teamPrevTitle = document.getElementById('team_prev_title');
  const saveButton = document.getElementById('saveButton');
  if (!teamText) {
    errorMessage.textContent = 'Please enter a team to save.';
    teamPrevTitle.textContent = 'Team Preview';
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  try {
    const { team, errors } = parseShowdownTeam(teamText);
    if (team.length === 0) {
      errorMessage.textContent = 'No valid Pokémon found to save.\n' + errors.join('\n');
      teamPrevTitle.textContent = 'Team Preview';
      saveButton.disabled = false;
      saveButton.textContent = 'Save Team';
      return;
    }
    if (window.Twitch && window.Twitch.ext && window.Twitch.ext.configuration) {
      const configData = JSON.stringify(team, (key, value) => {
        if (value === undefined) {
          console.warn(`Undefined value found for key: ${key}`);
          return null;
        }
        return value;
      });
      console.log('Configuration data to save:', configData, `Team length: ${team.length}`);
      try {
        window.Twitch.ext.configuration.set('broadcaster', '1.0', configData);
        console.log('Configuration set for broadcaster segment');
        errorMessage.textContent = 'Team saved successfully!\n' + (errors.length > 0 ? errors.join('\n') : '');
        teamPrevTitle.textContent = 'Current Team';
        if (window.Twitch.ext.send) {
          window.Twitch.ext.send('broadcast', 'text', configData);
          console.log('PubSub message sent:', configData);
        }
        let verifyAttempts = 0;
        const maxVerifyAttempts = 3;
        function verifySave() {
          verifyAttempts++;
          console.log(`Verifying save (attempt ${verifyAttempts})`);
          const savedConfig = window.Twitch.ext.configuration.broadcaster;
          if (savedConfig && savedConfig.content) {
            try {
              const parsedConfig = JSON.parse(savedConfig.content);
              console.log('Save verified, configuration retrieved:', parsedConfig, `Length: ${parsedConfig.length}`);
              if (parsedConfig.length === team.length) {
                errorMessage.textContent = 'Team saved and verified successfully!\n' + (errors.length > 0 ? errors.join('\n') : '');
              } else {
                console.warn('Save verification failed: Team length mismatch', { savedLength: parsedConfig.length, expectedLength: team.length });
                errorMessage.textContent = 'Warning: Saved team length mismatch.';
              }
            } catch (parseError) {
              console.error('Error parsing saved configuration:', parseError);
              errorMessage.textContent = 'Warning: Saved team corrupted.';
            }
          } else {
            console.warn('Save verification failed: No configuration retrieved', savedConfig);
            if (verifyAttempts < maxVerifyAttempts) {
              console.log(`Retrying save verification (attempt ${verifyAttempts + 1})`);
              setTimeout(verifySave, 1000);
            } else {
              errorMessage.textContent = 'Warning: Save may not have persisted.';
            }
          }
          saveButton.disabled = false;
          saveButton.textContent = 'Save Team';
        }
        setTimeout(verifySave, 1000);
      } catch (saveError) {
        console.error('Error calling configuration.set:', saveError);
        errorMessage.textContent = 'Error saving team to Twitch: ' + saveError.message;
        teamPrevTitle.textContent = 'Team Preview';
        saveButton.disabled = false;
        saveButton.textContent = 'Save Team';
      }
    } else {
      console.log('Twitch.ext not available, logging team:', team);
      localStorage.setItem('pokemonTeam', configData);
      errorMessage.textContent = 'Team saved locally.\n' + (errors.length > 0 ? errors.join('\n') : '');
      teamPrevTitle.textContent = 'Current Team';
      saveButton.disabled = false;
      saveButton.textContent = 'Save Team';
    }
  } catch (error) {
    console.error('Error saving team:', error);
    errorMessage.textContent = 'Error parsing team: ' + error.message;
    teamPrevTitle.textContent = 'Team Preview';
    saveButton.disabled = false;
    saveButton.textContent = 'Save Team';
  }
}

// Initialize Twitch Extension
window.Twitch = window.Twitch || { ext: { configuration: { onChanged: () => {} }, listen: () => {}, send: () => {} } };
window.Twitch.ext.onAuthorized = window.Twitch.ext.onAuthorized || (auth => console.log('Authorized:', auth));
window.Twitch.ext.onError = (error) => console.error('Twitch Extension Error:', error);