import Markdoc, { type ConfigType, type RenderableTreeNode, type Node } from '@markdoc/markdoc';
import type { Root, Text, Element } from 'hast';
import yaml from 'js-yaml';
import {
	bundledLanguages,
	createHighlighter,
	type HighlighterGeneric,
	type BuiltinTheme,
	type BundledLanguage,
	type BundledTheme
} from 'shiki';

// TODO: check if shiki plugin can be hooked up later
// import Shiki from '@shikijs/markdown-it';

export function hastToMarkdocTag(root: Root): RenderableTreeNode | RenderableTreeNode[] {
	const stack: [Root | Element | Text, RenderableTreeNode[]][] = [[root, []]];
	let result: RenderableTreeNode | RenderableTreeNode[] = [];

	while (stack.length > 0) {
		const [node, parentChildren] = stack.pop()!;

		if (node.type === 'element') {
			const children: RenderableTreeNode[] = [];
			const tag = new Markdoc.Tag(node.tagName, node.properties, children);
			parentChildren.push(tag);

			for (let i = node.children.length - 1; i >= 0; i--) {
				stack.push([node.children[i] as Root | Element | Text, children]);
			}
		} else if (node.type === 'text') {
			parentChildren.push(node.value);
		} else if (node.type === 'root') {
			for (let i = node.children.length - 1; i >= 0; i--) {
				stack.push([node.children[i] as Root | Element | Text, result as RenderableTreeNode[]]);
			}
		}
	}

	return root.type === 'root' && result.length === 1 ? result[0] : result;
}

export type TOCItem = {
	id: string;
	title: string;
	headings?: TOCItem[];
	[key: string]: any;
};

export type NodeWithName = Node & { name?: string };

let highlighter: Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> | undefined;

export class MarkdocX {
	private slugs: Map<string, number>;
	private shikiCache: Map<string, any>;
	private themes;
	private imagePrefix: string;
	private transformConfig: ConfigType;

	public frontmatter: Record<string, any>;

	constructor(
		config: ConfigType & {
			viteImagePrefix?: string;
			langs?: string[];
		} & ({ theme: BuiltinTheme } | { themes: Record<string, BuiltinTheme> })
	) {
		this.slugs = new Map<string, number>();
		this.shikiCache = new Map<string, string>();
		this.frontmatter = {};
		this.themes = 'themes' in config ? config.themes : { light: config.theme };
		highlighter ??= createHighlighter({
			themes: Object.values(this.themes),
			langs: config.langs ?? Object.keys(bundledLanguages)
		});
		this.imagePrefix = config.viteImagePrefix ?? './';

		this.transformConfig = {
			nodes: config.nodes || {
				heading: this.heading,
				image: this.image,
				// TODO: might not need this one, if shiki plugin can be hooked directly
				fence: this.fence
			},
			tags: config.tags,
			functions: config.functions,
			variables: config.variables,
			partials: config.partials
		};
	}

	private getFrontmatter(frontmatter: string) {
		return yaml.load(frontmatter);
	}

	public async parse(
		src: string,
		config?: { typographer?: boolean; allowIndentation?: boolean; allowComments?: boolean }
	) {
		let ast: Node;
		if (config) {
			// TODO: if plugins can be hooked, type plugins
			// @ts-ignore
			const { plugins, ...rest } = config;
			const tokenizer = new Markdoc.Tokenizer({
				...rest
			});
			// TODO: Can I just hook up plugins this way? Need to look at it later.
			// for (const plugin of config.plugins) {
			// 	tokenizer['parser'].use(plugin);
			// }
			// test with shiki
			// tokenizer['parser'].use(
			// 	await Shiki({
			// 		themes: {
			// 			light: 'vitesse-light',
			// 			dark: 'vitesse-dark'
			// 		}
			// 	})
			// );
			ast = Markdoc.parse(tokenizer.tokenize(src));
		} else {
			ast = Markdoc.parse(src);
		}
		this.frontmatter = this.getFrontmatter(ast.attributes.frontmatter ?? {}) as Record<string, any>;
		this.transformConfig.variables = {
			frontmatter: this.frontmatter,
			...this.transformConfig.variables
		};
		return ast;
	}

	public transform(ast: Node) {
		return Markdoc.transform(ast, this.transformConfig);
	}

	public async process(doc: string) {
		return this.transform(await this.parse(doc));
	}

	private generateID(children: RenderableTreeNode[], attributes: Record<string, any>) {
		if (attributes.id && typeof attributes.id === 'string') {
			return attributes.id;
		}
		const slug =
			children
				.filter((child) => typeof child === 'string')
				.join('-')
				.toLowerCase()
				.replace(/^[^a-z]+|[^a-z0-9_]+/g, (match, offset) => (offset === 0 ? '' : '-'))
				.replace(/-{2,}/g, '-')
				.replace(/^-+|-+$/g, '') || 'empty';

		const count = this.slugs.get(slug) ?? 0;
		const finalSlug = count ? `${slug}-${count}` : slug;
		this.slugs.set(slug, count + 1);
		return finalSlug;
	}

	// TODO: do i unwrap images when the only thing separating them is a newline or not?
	public unwrapImages(root: NodeWithName) {
		const stack = [root];
		while (stack.length > 0) {
			const node = stack.pop();
			if (node?.children) {
				for (let i = node.children.length - 1; i >= 0; i--) {
					const child = node.children[i];
					if (
						(child as NodeWithName).name === 'p' &&
						child.children.every(
							(element: any) => element instanceof Markdoc.Tag && element.name === 'img'
						)
					) {
						node.children.splice(i, 1, ...child.children);
					} else {
						stack.push(child as NodeWithName);
					}
				}
			}
		}
	}

	public readingTime(root: NodeWithName, wpm = 200, round = true) {
		const parts: string[] = [];
		const stack = [root];

		while (stack.length > 0) {
			const node = stack.pop();
			if (typeof node === 'string') {
				parts.push((node as string).trim());
			}
			if (node?.children) {
				for (let i = node.children.length - 1; i >= 0; i--) {
					stack.push(node.children[i] as NodeWithName);
				}
			}
		}

		const text = parts.join(' ');
		const wordCount = (text.match(/\b[\p{L}\p{N}'-]+\b/gu) || []).length;
		if (round) {
			return Math.round(wordCount / wpm);
		} else {
			return wordCount / wpm;
		}
	}

	public heading = {
		children: ['inline'],
		attributes: {
			id: { type: String },
			level: { type: Number, required: true, default: 1 }
		},
		transform: (node: Node, config: Record<string, any>) => {
			const attributes = node.transformAttributes(config);
			const children = node.transformChildren(config);

			const id: string = this.generateID(children, attributes);

			return new Markdoc.Tag(`h${node.attributes['level']}`, { ...attributes, id }, children);
		}
	};

	public image = {
		attributes: {
			src: { type: String, required: true },
			alt: { type: String, required: true },
			title: { type: String }
		},
		transform: (node: Node, config: Record<string, any>) => {
			const attributes = node.transformAttributes(config);

			// TODO: Figure out how to use enhanced:img
			return new Markdoc.Tag('img', {
				...attributes,
				src: `${this.imagePrefix}${attributes.src}`
			});
		}
	};

	public fence = {
		attributes: Markdoc.nodes.fence.attributes,
		transform: async (node: Node, config: Record<string, any>) => {
			const attributes = node.transformAttributes(config);
			const children = node.children.length
				? node.transformChildren(config)
				: [node.attributes.content];

			let { language, content } = node.attributes;
			const languageParts = language.split(':');
			const meta: Record<string, string> = { __raw: languageParts.slice(1).join(' ') };
			for (let i = languageParts.length - 1; i >= 1; --i) {
				const [key, value] = languageParts.at(i).split('=');
				if (value) {
					meta[key] = decodeURIComponent(value);
				}
			}
			language = languageParts.at(0);

			const shikiHighlighter = await highlighter;
			const langs = shikiHighlighter!.getLoadedLanguages();
			if (!langs.includes(language)) {
				return new Markdoc.Tag('pre', attributes, children);
			}
			const cachedValue = this.shikiCache.get(content);
			if (cachedValue) {
				return cachedValue;
			}

			const hastHighlight = shikiHighlighter!.codeToHast(content, {
				lang: language,
				themes: this.themes,
				meta: meta
			});

			const tagHighlight = hastToMarkdocTag(hastHighlight);
			// @ts-ignore
			tagHighlight?.children.unshift(new Markdoc.Tag('CopyCode', { meta: meta }));
			this.shikiCache.set(content, tagHighlight);
			return tagHighlight;
		}
	};

	public getTOC(root: NodeWithName, minLevel = 1, maxLevel = 6): TOCItem[] {
		const result: TOCItem[] = [];
		const stack = [root];
		const tocstack: TOCItem[] = [];

		while (stack.length > 0) {
			const node = stack.pop();
			if (node?.name) {
				const level = parseInt(node.name.slice(1));
				if (!isNaN(level) && node.name.startsWith('h') && level >= minLevel && level <= maxLevel) {
					const title = node.children[0];
					if (typeof title === 'string') {
						const item: Omit<TOCItem, 'id'> = {
							...node.attributes,
							title
						};
						while (tocstack.length > level - minLevel) {
							const lasthead = tocstack.pop();
							if (lasthead?.headings?.length === 0) {
								delete lasthead.headings;
							}
						}
						if (tocstack.length === 0) {
							result.push(item as TOCItem);
						} else {
							tocstack.at(-1)!.headings ??= [];
							tocstack.at(-1)!.headings!.push(item as TOCItem);
						}
						tocstack.push(item as TOCItem);
					}
				}
			}
			if (node?.children) {
				for (let i = node.children.length - 1; i >= 0; --i) {
					if (typeof node.children[i] !== 'string') {
						stack.push(node.children[i]);
					}
				}
			}
		}

		while (tocstack.length > 0) {
			const lasthead = tocstack.pop();
			if (lasthead?.headings?.length === 0) {
				delete lasthead.headings;
			}
		}

		return result;
	}
}
