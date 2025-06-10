// Global flag to prevent concurrent renders
let rendering = false;

document.addEventListener('DOMContentLoaded', () => {
  const teamDisplay = document.getElementById('team-display');
  if (!teamDisplay) {
    console.error('Team display element not found');
    return;
  }

  // Initialize Twitch Extension
  window.Twitch = window.Twitch || { ext: { configuration: { onChanged: () => {} }, listen: () => {}, send: () => {} } };
  window.Twitch.ext.onAuthorized = window.Twitch.ext.onAuthorized || (auth => console.log('Authorized:', auth));
  window.Twitch.ext.onError = (error) => console.error('Twitch Extension Error:', error);

  // Load team from configuration on page load
  function loadConfiguration(attempt = 1, maxAttempts = 3) {
    if (!(window.Twitch && window.Twitch.ext && window.Twitch.ext.configuration)) {
      console.error('Twitch SDK not available or configuration service not initialized');
      return;
    }

    console.log(`Checking for saved configuration (attempt ${attempt})`);
    const savedConfig = window.Twitch.ext.configuration.broadcaster;
    if (savedConfig && savedConfig.content) {
      try {
        console.log('Loaded configuration:', savedConfig);
        const team = JSON.parse(savedConfig.content);
        console.log('Parsed saved team:', team, `Length: ${team.length}`);
        renderTeam(team);
      } catch (error) {
        console.error('Error loading saved configuration:', error);
      }
    } else {
      console.log('No saved configuration found or configuration is empty');
      if (attempt < maxAttempts) {
        console.log(`Retrying configuration load (attempt ${attempt + 1})`);
        setTimeout(() => loadConfiguration(attempt + 1, maxAttempts), 1000);
      }
    }
  }

  loadConfiguration();

  // Listen for PubSub messages
  if (window.Twitch.ext.listen) {
    window.Twitch.ext.listen('broadcast', (target, contentType, message) => {
      console.log('Received PubSub message:', { target, contentType, message });
      try {
        const team = JSON.parse(message);
        console.log('Parsed PubSub team:', team, `Length: ${team.length}`);
        renderTeam(team);
      } catch (error) {
        console.error('Error parsing PubSub message:', error);
      }
    });
  } else {
    console.warn('Twitch.ext.listen not available, relying on configuration only');
  }

  // Handle configuration changes
  window.Twitch.ext.configuration.onChanged(() => {
    console.log('Configuration changed event received');
    loadConfiguration();
  });
});

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
  const teamDisplay = document.getElementById('team-display');
  if (!teamDisplay) {
    console.error('Team display element not found');
    return;
  }

  if (rendering) {
    console.log('Render in progress, skipping redundant render');
    return;
  }
  rendering = true;

  console.log('Rendering team with length:', team ? team.length : 0);
  teamDisplay.innerHTML = ''; // Clear existing content

  if (!team || team.length === 0) {
    console.log('No valid Pokémon found to render');
    rendering = false;
    return;
  }

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

    teamDisplay.appendChild(pokemonDiv);
  }

  rendering = false;
}