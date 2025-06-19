document.addEventListener('DOMContentLoaded', () => {
    // --- Navbar Functionality ---
    const navToggle = document.querySelector('.nav-toggle');
    const navList = document.querySelector('#navbar ul');
    const navLinks = document.querySelectorAll('#navbar ul li a');

    navToggle.addEventListener('click', () => {
        navList.classList.toggle('active');
        navToggle.setAttribute('aria-expanded', navList.classList.contains('active'));
    });

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            document.querySelector(targetId).scrollIntoView({
                behavior: 'smooth'
            });
            if (navList.classList.contains('active')) {
                navList.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // --- Interactive Story Logic ---

    // Data structure to store stories and their nodes
    let stories = JSON.parse(localStorage.getItem('interactiveStories')) || [];

    // Elements
    const createStorySection = document.getElementById('create-story');
    const browseStoriesSection = document.getElementById('browse-stories');
    const startNewStoryBtn = document.getElementById('start-new-story');
    const storyEditor = document.getElementById('story-editor');
    const storyTitleInput = document.getElementById('story-title-input');
    const storyIntroInput = document.getElementById('story-intro-input');
    const storyNodesContainer = document.getElementById('story-nodes-container');
    const saveStoryBtn = document.getElementById('save-story');
    const storyListDiv = document.querySelector('.story-list');
    const storyReaderDiv = document.querySelector('.story-reader');
    const readerStoryTitle = document.getElementById('reader-story-title');
    const readerStoryContent = document.getElementById('reader-story-content');
    const readerChoicesContainer = document.getElementById('reader-choices-container');

    let currentEditingStory = null; 
    let currentNodeIdCounter = 0; 

    // Function to generate a unique ID for story nodes
    function generateUniqueNodeId() {
        return `node-${Date.now()}-${currentNodeIdCounter++}`;
    }

    // Function to render a story node editor
    function renderStoryNode(node = { id: generateUniqueNodeId(), content: '', choices: [] }, allNodeIds = []) {
        const nodeDiv = document.createElement('div');
        nodeDiv.classList.add('story-node');
        nodeDiv.dataset.nodeId = node.id;

        const nodeContentId = `node-content-${node.id}`;
        const choicesContainerId = `choices-container-${node.id}`;

        nodeDiv.innerHTML = `
            <h3>Node ID: ${node.id}</h3>
            <label for="${nodeContentId}">Node Content:</label>
            <textarea id="${nodeContentId}" placeholder="Enter the story content for this node...">${node.content}</textarea>
            <div id="${choicesContainerId}" class="choices-container">
                <h4>Choices:</h4>
                </div>
            <button class="add-choice-btn" data-node-id="${node.id}">Add Choice</button>
            <button class="remove-node-btn" data-node-id="${node.id}">Remove Node</button>
        `;

        storyNodesContainer.insertBefore(nodeDiv, storyNodesContainer.querySelector('.add-node-btn'));

        const choicesContainer = nodeDiv.querySelector(`#${choicesContainerId}`);

        node.choices.forEach(choice => {
            renderChoiceInput(choicesContainer, node.id, choice, allNodeIds);
        });

        // Add event listeners for new elements
        nodeDiv.querySelector(`#${nodeContentId}`).addEventListener('input', (e) => {
            const story = currentEditingStory;
            const targetNode = story.nodes.find(n => n.id === node.id);
            if (targetNode) {
                targetNode.content = e.target.value;
            }
        });

        nodeDiv.querySelector('.add-choice-btn').addEventListener('click', (e) => {
            renderChoiceInput(choicesContainer, node.id, { text: '', nextNode: '' }, allNodeIds);
        });

        nodeDiv.querySelector('.remove-node-btn').addEventListener('click', (e) => {
            removeStoryNode(node.id);
        });
    }

    // Function to render a choice input
    function renderChoiceInput(container, nodeId, choice = { text: '', nextNode: '' }, allNodeIds = []) {
        const choiceDiv = document.createElement('div');
        choiceDiv.classList.add('choice-input');

        const choiceInputId = `choice-text-${nodeId}-${generateUniqueNodeId()}`; // Unique ID for choice text input
        const nextNodeSelectId = `next-node-select-${nodeId}-${generateUniqueNodeId()}`; // Unique ID for select

        choiceDiv.innerHTML = `
            <input type="text" id="${choiceInputId}" placeholder="Choice text..." value="${choice.text}">
            <select id="${nextNodeSelectId}" class="next-node-select">
                <option value="">Select next node...</option>
                ${allNodeIds.map(id => `<option value="${id}" ${choice.nextNode === id ? 'selected' : ''}>${id}</option>`).join('')}
            </select>
            <button class="remove-choice-btn" type="button">X</button>
        `;
        container.appendChild(choiceDiv);

        // Add event listeners for new elements
        const choiceTextInput = choiceDiv.querySelector(`#${choiceInputId}`);
        const nextNodeSelect = choiceDiv.querySelector(`#${nextNodeSelectId}`);
        const removeChoiceBtn = choiceDiv.querySelector('.remove-choice-btn');

        choiceTextInput.addEventListener('input', (e) => {
            const story = currentEditingStory;
            const targetNode = story.nodes.find(n => n.id === nodeId);
            if (targetNode) {
                const choiceIndex = Array.from(container.children).indexOf(choiceDiv);
                if (targetNode.choices[choiceIndex]) {
                    targetNode.choices[choiceIndex].text = e.target.value;
                }
            }
        });

        nextNodeSelect.addEventListener('change', (e) => {
            const story = currentEditingStory;
            const targetNode = story.nodes.find(n => n.id === nodeId);
            if (targetNode) {
                const choiceIndex = Array.from(container.children).indexOf(choiceDiv);
                if (targetNode.choices[choiceIndex]) {
                    targetNode.choices[choiceIndex].nextNode = e.target.value;
                }
            }
        });

        removeChoiceBtn.addEventListener('click', () => {
            removeChoiceInput(choiceDiv, nodeId);
        });
    }

    // Function to remove a choice input
    function removeChoiceInput(choiceDiv, nodeId) {
        const story = currentEditingStory;
        const targetNode = story.nodes.find(n => n.id === nodeId);
        if (targetNode) {
            const choiceIndex = Array.from(choiceDiv.parentNode.children).indexOf(choiceDiv);
            if (targetNode.choices[choiceIndex]) {
                targetNode.choices.splice(choiceIndex, 1);
            }
        }
        choiceDiv.remove();
    }

    // Function to update all node IDs in all select elements for choices
    function updateAllNodeSelects() {
        const allNodeIds = currentEditingStory.nodes.map(node => node.id);
        document.querySelectorAll('.next-node-select').forEach(selectElement => {
            const currentSelectedValue = selectElement.value;
            selectElement.innerHTML = '<option value="">Select next node...</option>' +
                                      allNodeIds.map(id => `<option value="${id}">${id}</option>`).join('');
            selectElement.value = currentSelectedValue; // Re-select the previously chosen value if it still exists
        });
    }


    // Function to remove a story node
    function removeStoryNode(nodeId) {
        if (!currentEditingStory) return;

        const nodeIndex = currentEditingStory.nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex !== -1) {
            currentEditingStory.nodes.splice(nodeIndex, 1);
            document.querySelector(`.story-node[data-node-id="${nodeId}"]`).remove();
            updateAllNodeSelects(); // Update dropdowns after removing a node
            // Also, remove any choices that pointed to this node
            currentEditingStory.nodes.forEach(node => {
                node.choices = node.choices.filter(choice => choice.nextNode !== nodeId);
            });
        }
    }


    // Event listener for "Start a New Story" button
    startNewStoryBtn.addEventListener('click', () => {
        storyEditor.style.display = 'block';
        startNewStoryBtn.style.display = 'none';
        storyTitleInput.value = '';
        storyIntroInput.value = '';
        storyNodesContainer.innerHTML = '<button class="add-node-btn">Add Decision Point</button>'; // Clear previous nodes
        currentEditingStory = {
            id: `story-${Date.now()}`,
            title: '',
            introduction: '',
            nodes: []
        };
        // Add an initial node
        const initialNode = { id: generateUniqueNodeId(), content: 'This is the start of your story.', choices: [] };
        currentEditingStory.nodes.push(initialNode);
        renderStoryNode(initialNode, [initialNode.id]);
    });

    // Event listener for "Add Decision Point" button
    storyNodesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-node-btn')) {
            if (!currentEditingStory) {
                alert('Please start a new story first.');
                return;
            }
            const newNode = { id: generateUniqueNodeId(), content: '', choices: [] };
            currentEditingStory.nodes.push(newNode);
            const allNodeIds = currentEditingStory.nodes.map(node => node.id);
            renderStoryNode(newNode, allNodeIds);
            updateAllNodeSelects();
        }
    });

    // Event listener for "Save Story" button
    saveStoryBtn.addEventListener('click', () => {
        if (!currentEditingStory) {
            alert('No story to save. Please start a new story.');
            return;
        }

        currentEditingStory.title = storyTitleInput.value.trim();
        currentEditingStory.introduction = storyIntroInput.value.trim();

        if (!currentEditingStory.title || !currentEditingStory.introduction || currentEditingStory.nodes.length === 0) {
            alert('Please fill in the story title, introduction, and add at least one node.');
            return;
        }

        // Validate that all choices point to existing nodes
        for (const node of currentEditingStory.nodes) {
            for (const choice of node.choices) {
                if (choice.nextNode && !currentEditingStory.nodes.some(n => n.id === choice.nextNode)) {
                    alert(`Error: Choice "${choice.text}" in Node ${node.id} points to a non-existent node (${choice.nextNode}).`);
                    return;
                }
            }
        }

        const existingStoryIndex = stories.findIndex(s => s.id === currentEditingStory.id);
        if (existingStoryIndex !== -1) {
            stories[existingStoryIndex] = currentEditingStory; // Update existing story
        } else {
            stories.push(currentEditingStory); // Add new story
        }

        localStorage.setItem('interactiveStories', JSON.stringify(stories));
        alert('Story saved successfully!');
        displayStoryList(); // Refresh the list of stories
        resetStoryEditor();
    });

    // Function to reset the story editor
    function resetStoryEditor() {
        storyEditor.style.display = 'none';
        startNewStoryBtn.style.display = 'block';
        storyTitleInput.value = '';
        storyIntroInput.value = '';
        storyNodesContainer.innerHTML = '<button class="add-node-btn">Add Decision Point</button>';
        currentEditingStory = null;
        currentNodeIdCounter = 0; // Reset counter for new stories
    }

    // Function to display the list of saved stories
    function displayStoryList() {
        storyListDiv.innerHTML = '';
        if (stories.length === 0) {
            storyListDiv.innerHTML = '<p>No stories available yet. Be the first to create one!</p>';
            return;
        }

        stories.forEach(story => {
            const storyCard = document.createElement('div');
            storyCard.classList.add('story-card');
            storyCard.dataset.storyId = story.id;
            storyCard.innerHTML = `
                <h3>${story.title}</h3>
                <p>${story.introduction.substring(0, 100)}...</p>
                <button class="read-story-btn">Read Story</button>
                <button class="edit-story-btn">Edit Story</button>
                <button class="delete-story-btn">Delete Story</button>
            `;
            storyListDiv.appendChild(storyCard);

            storyCard.querySelector('.read-story-btn').addEventListener('click', () => {
                readStory(story.id);
            });
            storyCard.querySelector('.edit-story-btn').addEventListener('click', () => {
                editStory(story.id);
            });
            storyCard.querySelector('.delete-story-btn').addEventListener('click', () => {
                deleteStory(story.id);
            });
        });
    }

    // Function to edit a story
    function editStory(storyId) {
        const storyToEdit = stories.find(s => s.id === storyId);
        if (!storyToEdit) {
            alert('Story not found.');
            return;
        }
        currentEditingStory = JSON.parse(JSON.stringify(storyToEdit)); // Deep copy to avoid direct modification
        storyEditor.style.display = 'block';
        startNewStoryBtn.style.display = 'none';
        storyTitleInput.value = currentEditingStory.title;
        storyIntroInput.value = currentEditingStory.introduction;
        storyNodesContainer.innerHTML = '<button class="add-node-btn">Add Decision Point</button>'; // Clear existing nodes

        // Re-render all nodes
        const allNodeIds = currentEditingStory.nodes.map(node => node.id);
        currentEditingStory.nodes.forEach(node => {
            renderStoryNode(node, allNodeIds);
        });
        updateAllNodeSelects();
    }

    // Function to delete a story
    function deleteStory(storyId) {
        if (confirm('Are you sure you want to delete this story?')) {
            stories = stories.filter(s => s.id !== storyId);
            localStorage.setItem('interactiveStories', JSON.stringify(stories));
            displayStoryList();
            alert('Story deleted.');
        }
    }

    // Function to read a story
    function readStory(storyId) {
        const storyToRead = stories.find(s => s.id === storyId);
        if (!storyToRead) {
            alert('Story not found.');
            return;
        }

        storyListDiv.style.display = 'none';
        storyReaderDiv.style.display = 'block';
        readerStoryTitle.textContent = storyToRead.title;

        // Start from the first node (assuming the first node in the array is the starting point)
        // A more robust system might have a designated 'startNodeId' in the story object
        if (storyToRead.nodes.length > 0) {
            renderStoryNodeForReading(storyToRead.nodes[0], storyToRead);
        } else {
            readerStoryContent.textContent = "This story has no content yet!";
            readerChoicesContainer.innerHTML = '';
        }
    }

    // Function to render a story node for reading
    function renderStoryNodeForReading(node, story) {
        readerStoryContent.innerHTML = `<p>${node.content}</p>`;
        readerChoicesContainer.innerHTML = '';

        if (node.choices.length > 0) {
            node.choices.forEach(choice => {
                const choiceBtn = document.createElement('button');
                choiceBtn.classList.add('reader-choice-btn');
                choiceBtn.textContent = choice.text;
                choiceBtn.addEventListener('click', () => {
                    const nextNode = story.nodes.find(n => n.id === choice.nextNode);
                    if (nextNode) {
                        renderStoryNodeForReading(nextNode, story);
                    } else {
                        // End of story or error
                        readerStoryContent.innerHTML += `<p>The adventure ends here!</p>`;
                        readerChoicesContainer.innerHTML = '<button class="reader-reset-btn">Read Again</button>';
                        readerChoicesContainer.querySelector('.reader-reset-btn').addEventListener('click', () => {
                            readStory(story.id); // Restart the story
                        });
                    }
                });
                readerChoicesContainer.appendChild(choiceBtn);
            });
        } else {
            // End of story
            readerStoryContent.innerHTML += `<p>The adventure ends here!</p>`;
            readerChoicesContainer.innerHTML = '<button class="reader-reset-btn">Read Again</button>';
            readerChoicesContainer.querySelector('.reader-reset-btn').addEventListener('click', () => {
                readStory(story.id); // Restart the story
            });
        }
    }

    // Go back to story list from reader
    const returnToListBtn = document.createElement('button');
    returnToListBtn.textContent = 'Back to Stories';
    returnToListBtn.style.marginTop = '20px';
    returnToListBtn.addEventListener('click', () => {
        storyReaderDiv.style.display = 'none';
        storyListDiv.style.display = 'block';
    });
    storyReaderDiv.appendChild(returnToListBtn);


    // Initial display of stories on page load
    displayStoryList();
});

let stories = [
    {
        id: 'story-123',
        title: 'The Haunted Mansion',
        introduction: 'You arrive at a creepy old mansion...',
        nodes: [
            {
                id: 'node-start',
                content: 'The front door is creaking open. Do you enter or look for another way?',
                choices: [
                    { text: 'Enter the front door', nextNode: 'node-hallway' },
                    { text: 'Look for a back entrance', nextNode: 'node-garden' }
                ]
            },
            {
                id: 'node-hallway',
                content: 'You find yourself in a dusty hallway. There are two doors: one left, one right.',
                choices: [
                    { text: 'Go left', nextNode: 'node-kitchen' },
                    { text: 'Go right', nextNode: 'node-library' }
                ]
            },
        
        ]
    }
];