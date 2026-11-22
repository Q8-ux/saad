from setuptools import find_namespace_packages, setup

setup(
    name='cli-anything-writing-studio',
    version='1.0.0',
    description='CLI-Anything document automation for Arabic Writing Studio',
    python_requires='>=3.10',
    packages=find_namespace_packages(include=['cli_anything.*']),
    install_requires=['click>=8.1,<9'],
    extras_require={'test': ['pytest>=8', 'pymupdf>=1.24']},
    package_data={'cli_anything.writing_studio': [
        'README.md', 'runtime/*.mjs', 'runtime/fonts/*', 'runtime/*.json',
        'skills/*.md', 'utils/CLI-Anything-LICENSE',
    ]},
    entry_points={'console_scripts': [
        'cli-anything-writing-studio=cli_anything.writing_studio.writing_studio_cli:main',
    ]},
)
