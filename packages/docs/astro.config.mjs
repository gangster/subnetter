// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
	integrations: [
		react(),
		starlight({
			title: 'Subnetter Documentation',
			description: 'Documentation for the Subnetter IPv4 CIDR Allocation Tool',
			social: {
				github: 'https://github.com/gangster/subnetter',
			},
			sidebar: [
				{
					label: 'Home',
					link: '/',
				},
				{
					label: 'Getting Started',
					items: [
						{ label: 'Overview', link: '/getting-started' },
						{ label: 'Quick Start', link: '/getting-started/quick-start' },
						{ label: 'CLI Reference', link: '/getting-started/cli' },
						{ label: 'CIDR Primer', link: '/cidr-primer' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Configuration', link: '/configuration' },
						{ label: 'API Overview', link: '/api/overview' },
						{ label: 'TypeDoc API Docs', link: '/typedoc/index.html', attrs: { target: '_blank' } },
						{ label: 'Error Handling', link: '/error-handling' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Overview', link: '/guides' },
						{ label: 'Best Practices', link: '/guides/best-practices' },
						{ label: 'Real-World Examples', link: '/guides/examples' },
						{ label: 'Hierarchical Allocation', link: '/guides/hierarchical-cidr-allocation' },
						{ label: 'Kubernetes Network Design', link: '/guides/kubernetes-network-design' },
					],
				},
				{
					label: 'Integrations',
					items: [
						{ label: 'Overview', link: '/integrations' },
						{ label: 'NetBox', link: '/integrations/netbox' },
					],
				},
				{
					label: 'Troubleshooting',
					link: '/troubleshooting',
				},
				{
					label: 'Technical Details',
					items: [
						{ label: 'Architecture', link: '/architecture' },
						{ label: 'Project Roadmap', link: '/roadmap' },
					],
				},
				{
					label: 'For Developers',
					items: [
						{ label: 'Developer Guide', link: '/developer-guide' },
						{ label: 'Project Structure', link: '/project/structure' },
						{ label: 'CI/CD Pipeline', link: '/project/ci-cd-pipeline' },
						{ label: 'Manual Testing Guide', link: '/project/manual-testing' },
					],
				},
			],
			head: [
				{
					tag: 'script',
					attrs: {
						src: 'https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js',
					},
				},
				{
					tag: 'script',
					content: `
						document.addEventListener('DOMContentLoaded', function() {
							const isDarkMode = document.documentElement.dataset.theme === 'dark';
							
							window.mermaid.initialize({
								startOnLoad: true,
								theme: isDarkMode ? 'dark' : 'default',
								securityLevel: 'loose',
								htmlLabels: true,
								flowchart: {
									curve: 'basis',
									useMaxWidth: true
								},
								themeVariables: isDarkMode ? {
									// Dark theme variables with high contrast and vibrant colors
									primaryColor: '#4D8DDB',
									primaryTextColor: '#FFFFFF',
									primaryBorderColor: '#6FA8FF',
									lineColor: '#88CCFF',
									secondaryColor: '#1F2937',
									tertiaryColor: '#111827',
									// Additional colors for different node types with higher contrast
									nodeBorder: '#6FA8FF',
									mainBkg: '#4D8DDB',
									nodeBkg: '#1F2937',
									// Text colors with maximum readability
									edgeLabelBackground: '#1F2937',
									clusterBkg: '#1F2937',
									clusterBorder: '#6FA8FF',
									titleColor: '#FFFFFF',
									// Contrast improvements
									labelBackground: '#1F2937',
									labelColor: '#FFFFFF',
									// Make node text bright white and bold for better readability
									nodeTextColor: '#FFFFFF',
									// Make lines much more visible
									edgeColor: '#88CCFF',
									// More vibrant colors for better visual distinction in dark mode
									classText: '#FFFFFF'
								} : {
									// Light theme variables with high contrast
									primaryColor: '#2563EB',
									primaryTextColor: '#FFFFFF',
									primaryBorderColor: '#1D4ED8',
									lineColor: '#1D4ED8',
									secondaryColor: '#EFF6FF',
									tertiaryColor: '#FFFFFF',
									// Additional colors for different node types
									nodeBorder: '#1D4ED8',
									mainBkg: '#2563EB',
									nodeBkg: '#FFFFFF',
									// Text colors
									edgeLabelBackground: '#FFFFFF',
									clusterBkg: '#EFF6FF',
									clusterBorder: '#1D4ED8',
									titleColor: '#FFFFFF',
									// Contrast
									labelBackground: '#FFFFFF',
									labelColor: '#0F3058',
									// Make node text clear and bold for better readability
									nodeTextColor: '#0F3058'
								}
							});

							// Listen for theme changes
							const observer = new MutationObserver(function(mutations) {
								mutations.forEach(function(mutation) {
									if (mutation.attributeName === 'data-theme') {
										const isDarkMode = document.documentElement.dataset.theme === 'dark';
										window.mermaid.initialize({
											theme: isDarkMode ? 'dark' : 'default',
											themeVariables: isDarkMode ? {
												// Dark theme variables with high contrast and vibrant colors
												primaryColor: '#4D8DDB',
												primaryTextColor: '#FFFFFF',
												primaryBorderColor: '#6FA8FF',
												lineColor: '#88CCFF',
												secondaryColor: '#1F2937',
												tertiaryColor: '#111827',
												// Additional colors for different node types with higher contrast
												nodeBorder: '#6FA8FF',
												mainBkg: '#4D8DDB',
												nodeBkg: '#1F2937',
												// Text colors with maximum readability
												edgeLabelBackground: '#1F2937',
												clusterBkg: '#1F2937',
												clusterBorder: '#6FA8FF',
												titleColor: '#FFFFFF',
												// Contrast improvements
												labelBackground: '#1F2937',
												labelColor: '#FFFFFF',
												// Make node text bright white and bold for better readability
												nodeTextColor: '#FFFFFF',
												// Make lines much more visible
												edgeColor: '#88CCFF',
												// More vibrant colors for better visual distinction in dark mode
												classText: '#FFFFFF'
											} : {
												// Light theme variables with high contrast
												primaryColor: '#2563EB',
												primaryTextColor: '#FFFFFF',
												primaryBorderColor: '#1D4ED8',
												lineColor: '#1D4ED8',
												secondaryColor: '#EFF6FF',
												tertiaryColor: '#FFFFFF',
												// Additional colors for different node types
												nodeBorder: '#1D4ED8',
												mainBkg: '#2563EB',
												nodeBkg: '#FFFFFF',
												// Text colors
												edgeLabelBackground: '#FFFFFF',
												clusterBkg: '#EFF6FF',
												clusterBorder: '#1D4ED8',
												titleColor: '#FFFFFF',
												// Contrast
												labelBackground: '#FFFFFF',
												labelColor: '#0F3058',
												// Make node text clear and bold for better readability
												nodeTextColor: '#0F3058'
											}
										});
										window.mermaid.init(undefined, '.mermaid:not([data-processed="true"])');
									}
								});
							});

							observer.observe(document.documentElement, { attributes: true });
						});
					`,
				},
			],
		}),
	],
	site: 'https://gangster.github.io',
	base: '/subnetter/',
	outDir: './dist',
	trailingSlash: 'always',
});
