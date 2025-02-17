let isOnRepositoriesPage = false;
let hasProcessedRepositories = false;

/**
 * Check if the current page is the repositories page and process the repositories if it is.
 */
function checkPage() {
    const currentUrl = window.location.href;
    const isRepositoriesPage = currentUrl.includes('/repositories');

    if (isRepositoriesPage && !isOnRepositoriesPage) {
    
        isOnRepositoriesPage = true;
        hasProcessedRepositories = false;
        console.log('Arrived on the repositories page');
    } else if (!isRepositoriesPage && isOnRepositoriesPage) {
    
        isOnRepositoriesPage = false;
        console.log('Left the repositories page');
    }

    if (isOnRepositoriesPage && !hasProcessedRepositories && is_document_ready()) {
    
        processRepositories();
        hasProcessedRepositories = true;
        console.log('Processed repositories');
    }
}

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
 *  Check if the document is ready by verifying the presence of the repository container and its items.
 * @returns {boolean} True if the document is ready, false otherwise.
 */
function is_document_ready() {
    const repoListContainer = getRepositoriesContainer();
    const repoItems = repoListContainer ? repoListContainer.querySelectorAll('li') : null;

    if (!repoListContainer || !repoItems || repoItems.length === 0) {
        console.log('Container or items not ready.');
        return false;
    }

    // Check if each item has the necessary content loaded
    for (const item of repoItems) {
        const repoTitleNode = document.evaluate(
            './/div[1]/h4/a/span',
            item,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        if (!repoTitleNode || !repoTitleNode.textContent.trim()) {
            console.log('Some items are missing their content.');
            return false;
        }
    }

    console.log('All items and their content are ready.');
    return true;
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

        // Remove the prefix in each MenuContent item
        const menuContentItems = menuContent.querySelectorAll('li');
        menuContentItems.forEach(item => {
            const repoTitleNode = document.evaluate(
                './/div[1]/h4/a/span',
                item,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            ).singleNodeValue;

            if (repoTitleNode) {
                const title = repoTitleNode.textContent.trim();
                repoTitleNode.textContent = title.substring(prefix.length + 1);
            }
        });

        // Toggle visibility of the menu content
        menuTitle.addEventListener('click', () => {
            const isVisible = menuContent.style.display === 'block';
            menuContent.style.display = isVisible ? 'none' : 'block';
        });

        menuContainer.appendChild(menuTitle);
        menuContainer.appendChild(menuContent);
        repoListContainer.insertBefore(menuContainer, repoListContainer.firstChild);
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

/**
 * Start checking the page every 100ms. Yep, that's really ugly. This is the only way I have found
 * to perform the execution of the processRepositories when the repositories page was clicked from any other page.
 * With the previous way with popstate event and onload usage, it was working in all cases except
 * when the repositories page was clicked from any other pages. In this case, the processRepositories
 * was not executed.
 * If anyone ever read this and have a better solution, please let me know !!!
 * Is that the reason that this function is at the really end of the file ? Yep, absolutely.
 */
function startChecking() {
    setInterval(checkPage, 100);
}


window.onload = function() {
    // Run the script
    startChecking();
}
