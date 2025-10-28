<script lang="ts">
	import {
		Header,
		HeaderUtilities,
		HeaderGlobalAction,
		SkipToContent,
		SideNav,
		SideNavItems,
		SideNavMenu,
		SideNavMenuItem,
		Content,
		StructuredList,
		StructuredListHead,
		StructuredListRow,
		StructuredListCell,
		StructuredListBody,
		Tag
	} from 'carbon-components-svelte';
	import { Moon, Sun } from 'carbon-icons-svelte';
	import { theme, toggleTheme } from '$lib/stores/themeStore';
	let isSideNavOpen = false;
	export let data;
	const comments = data.comments;
	const apiComments = comments.filter((c) => c.tags.some((t) => t.tag === 'route'));
	const typeComments = comments.filter((c) => c.tags.some((t) => t.tag === 'typedef'));
	const functionComments = comments.filter((c) => c.tags.some((t) => t.tag === 'name'));
</script>

<Header platformName="API Docs" bind:isSideNavOpen>
	<svelte:fragment slot="skip-to-content">
		<SkipToContent />
	</svelte:fragment>
	<HeaderUtilities>
		<HeaderGlobalAction
			iconDescription="Toggle theme"
			on:click={toggleTheme}
			hideTooltip={true}
			icon={$theme === 'g100' ? Sun : Moon}
		/>
	</HeaderUtilities>
</Header>

<SideNav bind:isOpen={isSideNavOpen}>
	<SideNavItems>
		<SideNavMenu text="API" expanded>
			{#each apiComments as commentBlock (JSON.stringify(commentBlock))}
				{@const routeTag = commentBlock.tags.find((t) => t.tag === 'route')}
				{#if routeTag}
					<SideNavMenuItem href="#{routeTag.description}">
						{routeTag.description}
					</SideNavMenuItem>
				{/if}
			{/each}
		</SideNavMenu>
		<SideNavMenu text="Functions" expanded>
			{#each functionComments as commentBlock (JSON.stringify(commentBlock))}
				{@const nameTag = commentBlock.tags.find((t) => t.tag === 'name')}
				{#if nameTag}
					<SideNavMenuItem href="#{nameTag.name}">{nameTag.name}</SideNavMenuItem>
				{/if}
			{/each}
		</SideNavMenu>
		<SideNavMenu text="Types" expanded>
			{#each typeComments as commentBlock (JSON.stringify(commentBlock))}
				{@const typeTag = commentBlock.tags.find((t) => t.tag === 'typedef')}
				{#if typeTag}
					<SideNavMenuItem href="#{typeTag.name}">{typeTag.name}</SideNavMenuItem>
				{/if}
			{/each}
		</SideNavMenu>
	</SideNavItems>
</SideNav>

<Content id="main-content" style="margin-left: {isSideNavOpen ? '16rem' : '3rem'}">
	{#if comments.length === 0}
		<p>No documentation found.</p>
	{:else}
		{#each apiComments as commentBlock (JSON.stringify(commentBlock))}
			{@const routeTag = commentBlock.tags.find((t) => t.tag === 'route')}
			{#if routeTag}
				<div id={routeTag.description} class="mb-12">
					<h1>
						<Tag type="green">{routeTag.description.split(' ')[0]}</Tag>
						<span>
							{routeTag.description.split(' ')[1]}
						</span>
					</h1>
					<p>
						{commentBlock.description.replace(/\n/g, '<br>')}
					</p>

					<h3>Parameters</h3>
					<StructuredList>
						<StructuredListHead>
							<StructuredListRow head>
								<StructuredListCell head>Name</StructuredListCell>
								<StructuredListCell head>Type</StructuredListCell>
								<StructuredListCell head>Description</StructuredListCell>
							</StructuredListRow>
						</StructuredListHead>
						<StructuredListBody>
							{#each commentBlock.tags.filter((t) => t.tag === 'param') as tag (JSON.stringify(tag))}
								<StructuredListRow>
									<StructuredListCell>{tag.name}</StructuredListCell>
									<StructuredListCell>
										<Tag type="blue">{tag.type}</Tag>
									</StructuredListCell>
									<StructuredListCell>{tag.description.replace(/\n/g, '<br>')}</StructuredListCell>
								</StructuredListRow>
							{/each}
						</StructuredListBody>
					</StructuredList>

					<h3>Body</h3>
					<StructuredList>
						<StructuredListHead>
							<StructuredListRow head>
								<StructuredListCell head>Name</StructuredListCell>
								<StructuredListCell head>Type</StructuredListCell>
								<StructuredListCell head>Description</StructuredListCell>
							</StructuredListRow>
						</StructuredListHead>
						<StructuredListBody>
							{#each commentBlock.tags.filter((t) => t.tag === 'body') as tag (JSON.stringify(tag))}
								<StructuredListRow>
									<StructuredListCell>{tag.name}</StructuredListCell>
									<StructuredListCell>
										<Tag type="blue">{tag.type}</Tag>
									</StructuredListCell>
									<StructuredListCell>{tag.description.replace(/\n/g, '<br>')}</StructuredListCell>
								</StructuredListRow>
							{/each}
						</StructuredListBody>
					</StructuredList>

					<h3>Responses</h3>
					<StructuredList>
						<StructuredListHead>
							<StructuredListRow head>
								<StructuredListCell head>Type</StructuredListCell>
								<StructuredListCell head>Description</StructuredListCell>
							</StructuredListRow>
						</StructuredListHead>
						<StructuredListBody>
							{#each commentBlock.tags.filter((t) => t.tag === 'returns') as tag (JSON.stringify(tag))}
								<StructuredListRow>
									<StructuredListCell>
										<Tag type="blue">{tag.type}</Tag>
									</StructuredListCell>
									<StructuredListCell>{tag.description.replace(/\n/g, '<br>')}</StructuredListCell>
								</StructuredListRow>
							{/each}
						</StructuredListBody>
					</StructuredList>

					<h3>Throws</h3>
					<StructuredList>
						<StructuredListHead>
							<StructuredListRow head>
								<StructuredListCell head>Type</StructuredListCell>
								<StructuredListCell head>Description</StructuredListCell>
							</StructuredListRow>
						</StructuredListHead>
						<StructuredListBody>
							{#each commentBlock.tags.filter((t) => t.tag === 'throws') as tag (JSON.stringify(tag))}
								<StructuredListRow>
									<StructuredListCell>
										<Tag type="red">{tag.type}</Tag>
									</StructuredListCell>
									<StructuredListCell>{tag.description.replace(/\n/g, '<br>')}</StructuredListCell>
								</StructuredListRow>
							{/each}
						</StructuredListBody>
					</StructuredList>

					<h3>Examples</h3>
					{#each commentBlock.tags.filter((t) => t.tag === 'example') as tag (JSON.stringify(tag))}
						<p>
							{tag.description.replace(/\n/g, '<br>')}
						</p>
					{/each}
				</div>
			{/if}
		{/each}

		{#each functionComments as commentBlock (JSON.stringify(commentBlock))}
			{@const nameTag = commentBlock.tags.find((t) => t.tag === 'name')}
			{#if nameTag}
				<div id={nameTag.name} class="mb-12">
					<h1>
						<span>{nameTag.name}</span>
					</h1>

					<p>
						{commentBlock.description.replace(/\n/g, '<br>')}
					</p>
					<h3>Parameters</h3>
					<StructuredList>
						<StructuredListHead>
							<StructuredListRow head>
								<StructuredListCell head>Name</StructuredListCell>
								<StructuredListCell head>Type</StructuredListCell>
								<StructuredListCell head>Description</StructuredListCell>
							</StructuredListRow>
						</StructuredListHead>
						<StructuredListBody>
							{#each commentBlock.tags.filter((t) => t.tag === 'param') as tag (JSON.stringify(tag))}
								<StructuredListRow>
									<StructuredListCell>{tag.name}</StructuredListCell>
									<StructuredListCell>
										<Tag type="blue">{tag.type}</Tag>
									</StructuredListCell>
									<StructuredListCell>{tag.description.replace(/\n/g, '<br>')}</StructuredListCell>
								</StructuredListRow>
							{/each}
						</StructuredListBody>
					</StructuredList>

					<h3>Returns</h3>
					<StructuredList>
						<StructuredListHead>
							<StructuredListRow head>
								<StructuredListCell head>Type</StructuredListCell>
								<StructuredListCell head>Description</StructuredListCell>
							</StructuredListRow>
						</StructuredListHead>
						<StructuredListBody>
							{#each commentBlock.tags.filter((t) => t.tag === 'returns') as tag (JSON.stringify(tag))}
								<StructuredListRow>
									<StructuredListCell>
										<Tag type="blue">{tag.type}</Tag>
									</StructuredListCell>
									<StructuredListCell>{tag.description.replace(/\n/g, '<br>')}</StructuredListCell>
								</StructuredListRow>
							{/each}
						</StructuredListBody>
					</StructuredList>
				</div>
			{/if}
		{/each}

		{#each typeComments as commentBlock (JSON.stringify(commentBlock))}
			{@const typeTag = commentBlock.tags.find((t) => t.tag === 'typedef')}
			{#if typeTag}
				<div id={typeTag.name} class="mb-12">
					<h1>
						<span>{typeTag.name}</span>
					</h1>

					<p>
						{commentBlock.description.replace(/\n/g, '<br>')}
					</p>

					<h3>Properties</h3>
					<StructuredList>
						<StructuredListHead>
							<StructuredListRow head>
								<StructuredListCell head>Name</StructuredListCell>
								<StructuredListCell head>Type</StructuredListCell>
								<StructuredListCell head>Description</StructuredListCell>
							</StructuredListRow>
						</StructuredListHead>
						<StructuredListBody>
							{#each commentBlock.tags.filter((t) => t.tag === 'property') as tag (JSON.stringify(tag))}
								<StructuredListRow>
									<StructuredListCell>{tag.name}</StructuredListCell>
									<StructuredListCell>
										<Tag type="blue">{tag.type}</Tag>
									</StructuredListCell>
									<StructuredListCell>{tag.description.replace(/\n/g, '<br>')}</StructuredListCell>
								</StructuredListRow>
							{/each}
						</StructuredListBody>
					</StructuredList>
				</div>
			{/if}
		{/each}
	{/if}
</Content>
