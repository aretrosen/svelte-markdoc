import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MarkdocX } from '$lib/markdoc/markdocx.js';

async function getPost(slug: string) {
	const file = path.resolve(`blogs/${slug}.md`);
	return await readFile(file, 'utf-8');
}

async function markdoc(slug: string) {
	const blog = await getPost(slug);

	const markdocx = new MarkdocX({
		tags: {
			callout: {
				render: 'Callout',
				attributes: {
					type: {
						type: String,
						default: 'note'
					}
				}
			},
			counter: {
				render: 'Counter'
			}
		},
		viteImagePrefix: './blogs/',
		themes: {
			light: 'solarized-light',
			dark: 'tokyo-night'
		}
	});

	const content = await markdocx.process(blog);

	// @ts-ignore
	const toc = markdocx.getTOC(content);
	// @ts-ignore
	const readingTimeMin = markdocx.readingTime(content);
	// notice: here, though transforming is what is needed, but typescript doesn't give a fuck
	// whether I am transforming a constant. That's why people say js is dangerous.

	// @ts-ignore
	markdocx.unwrapImages(content);

	return {
		// @ts-ignore
		children: JSON.stringify(content.children),
		frontmatter: markdocx.frontmatter,
		toc,
		readingTime:
			readingTimeMin === 0
				? 'less than a min. read'
				: `${readingTimeMin} min${readingTimeMin === 1 ? '' : 's'}. read`
	};
}

export async function load({ params }) {
	return await markdoc(params.slug);
}
