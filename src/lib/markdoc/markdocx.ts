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

export function hastToMarkdocTag(root: Root) {
	function traverse(node: Root | Element | Text) {
		if (node.type === 'element') {
			const children: RenderableTreeNode[] = [];
			for (const nchild of node.children) {
				const child = traverse(nchild as Root | Element | Text);
				if (child) {
					children.push(child);
				}
			}
			return new Markdoc.Tag(node.tagName, node.properties, children);
		} else if (node.type === 'text') {
			return node.value;
		}
	}
	if (root.type == 'root') {
		const children = [];
		for (const child of root.children) {
			children.push(traverse(child as Root | Element | Text));
		}
		return children.length === 1 ? children[0] : children;
	}
	return traverse(root);
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
	public unwrapImages(node: NodeWithName) {
		if (node && node.children) {
			let i = 0;
			while (i < node.children.length) {
				const child = node.children[i];
				if (
					(child as NodeWithName).name === 'p' &&
					child.children.every(
						(element: any) => element instanceof Markdoc.Tag && element.name === 'img'
					)
				) {
					const imageCount = child.children.length;
					node.children.splice(i, 1, ...child.children);
					i += imageCount;
				} else {
					this.unwrapImages(child as NodeWithName);
					i++;
				}
			}
		}
	}

	public readingTime(node: NodeWithName, wpm = 200, round = true) {
		const parts: string[] = [];
		function toText(node: NodeWithName) {
			if (node) {
				if (typeof node === 'string') {
					parts.push(node);
				}
				if (node.children) {
					for (const child of node.children) {
						toText(child as NodeWithName);
					}
				}
			}
		}
		toText(node);
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

			const { language, content } = node.attributes;
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
				themes: this.themes
			});

			const tagHighlight = hastToMarkdocTag(hastHighlight);
			this.shikiCache.set(content, tagHighlight);
			return tagHighlight;
		}
	};

	public getTOC(node: NodeWithName, minLevel = 1, maxLevel = 6): TOCItem[] {
		const result: TOCItem[] = [];
		const stack: TOCItem[] = [];

		function traverse(node: NodeWithName) {
			if (node && node.name) {
				const level = parseInt(node.name.slice(1));
				if (!isNaN(level) && node.name[0] === 'h' && level >= minLevel && level <= maxLevel) {
					const title = node.children[0];
					if (typeof title === 'string') {
						const item: Omit<TOCItem, 'id'> = {
							...node.attributes,
							title
						};
						while (stack.length >= level - minLevel + 1) {
							const popped = stack.pop()!;
							if (popped.headings?.length === 0) {
								delete popped.headings;
							}
						}
						if (stack.length === 0) {
							result.push(item as TOCItem);
						} else {
							stack[stack.length - 1].headings ??= [];
							stack[stack.length - 1].headings!.push(item as TOCItem);
						}
						stack.push(item as TOCItem);
					}
				}
			}
			if (node.children) {
				for (const child of node.children) {
					traverse(child as NodeWithName);
				}
			}
		}

		traverse(node);

		while (stack.length > 0) {
			const item = stack.pop()!;
			if (item.headings?.length === 0) {
				delete item.headings;
			}
		}

		return result;
	}
}
