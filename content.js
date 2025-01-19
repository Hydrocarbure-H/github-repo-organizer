/**
 * Get the container element that holds the list of repositories.
 * @returns {Element|null} The container element that holds the list of repositories, or null if not found.
 */
function getRepositoriesContainer() {
    const repoListContainer = document.evaluate(
        '//*[@id=":R5ab:-list-view-container"]/ul',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;

    if (!repoListContainer) {
        console.error("Repository list container not found.");
        return null;
    }

    return repoListContainer;
}

/**
 * Get the repository elements and their titles.
 * @param {Element} repoListContainer - The container element holding the repository list.
 * @returns {Array<{node: Element, title: string}>} Array of repository titles and their DOM nodes.
 */
function getRepositoriesData(repoListContainer) {
    const repoTitleNodes = document.evaluate(
        './/h4/a/span',
        repoListContainer,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
    );

    const repoData = [];
    for (let i = 0; i < repoTitleNodes.snapshotLength; i++) {
        const node = repoTitleNodes.snapshotItem(i);
        repoData.push({
            node: node.closest('li'), // Get the parent 'li' element
            title: node.textContent.trim()
        });
    }

    return repoData;
}

/**
 * Group repositories by their common prefix.
 * @param {Array<{node: Element, title: string}>} repoData - Array of repository titles and their DOM nodes.
 * @returns {Object} An object grouping repository nodes by prefix.
 */
function groupRepositoriesByPrefix(repoData) {
    return repoData.reduce((groups, { title, node }) => {
        const [prefix] = title.split('-');
        if (!groups[prefix]) {
            groups[prefix] = [];
        }
        groups[prefix].push(node);
        return groups;
    }, {});
}

/**
 * Create a collapsible menu for repositories with common prefixes, preserving the rest of the list.
 * @param {Object} repoGroups - An object grouping repository nodes by prefix.
 * @param {Element} repoListContainer - The container element holding the repository list.
 */
function createCollapsibleMenu(repoGroups, repoListContainer) {
    Object.entries(repoGroups).forEach(([prefix, nodes]) => {
        if (nodes.length < 2) return; // Skip groups with fewer than two repositories

        // Create a container for the collapsible menu
        const menuContainer = document.createElement('div');
        menuContainer.classList.add('menu-container');

        const menuTitle = document.createElement('div');
        menuTitle.classList.add('menu-title');
        menuTitle.textContent = prefix.toUpperCase();

        const menuContent = document.createElement('div');
        menuContent.classList.add('menu-content');
        menuContent.style.display = 'none';

        // Move repository nodes into the menu content
        nodes.forEach(node => {
            menuContent.appendChild(node);
        });

        // Toggle visibility of the menu content
        menuTitle.addEventListener('click', () => {
            const isVisible = menuContent.style.display === 'block';
            menuContent.style.display = isVisible ? 'none' : 'block';
        });

        menuContainer.appendChild(menuTitle);
        menuContainer.appendChild(menuContent);
        repoListContainer.appendChild(menuContainer);
    });
}

/**
 * Main function to process repositories and create collapsible menus while preserving ungrouped items.
 */
function processRepositories() {
    const repoListContainer = getRepositoriesContainer();
    if (!repoListContainer) return;

    const repoData = getRepositoriesData(repoListContainer);
    const repoGroups = groupRepositoriesByPrefix(repoData);

    // Separate orphan repositories from grouped ones
    const orphanNodes = repoData
        .filter(({ title }) => repoGroups[title.split('-')[0]].length < 2)
        .map(({ node }) => node);

    // Clear the container and reinsert orphan nodes
    repoListContainer.innerHTML = '';
    orphanNodes.forEach(node => repoListContainer.appendChild(node));

    // Create collapsible menus for grouped repositories
    createCollapsibleMenu(repoGroups, repoListContainer);
}

// Run the script
processRepositories();
