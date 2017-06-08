#!/usr/bin/env python

from setuptools import setup, find_packages

from codecs import open
from os import path

here = path.abspath(path.dirname(__file__))

# Get the long description from the README file
with open(path.join(here, 'README.rst'), encoding='utf-8') as f:
    long_description = f.read()

setup(
    name='zeppelinutils',
    version='0.0.5',
    description='Interface for easier usage of Zeppelin.',
    long_description=long_description,
    author='Jonathan Anderson',
    author_email='jonathan@jonathananderson.se',
    license='MIT',
    url='https://github.com/andersonjonathan/Zeppelin-utils',
    classifiers=[
        'Development Status :: 5 - Production/Stable',

        'Intended Audience :: Developers',

        'License :: OSI Approved :: MIT License',

        'Programming Language :: Python :: 2',
        'Programming Language :: Python :: 2.6',
        'Programming Language :: Python :: 2.7',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.3',
        'Programming Language :: Python :: 3.4',
        'Programming Language :: Python :: 3.5',
    ],
    keywords='Zeppelin',
    packages=['zeppelinutils'],
    install_requires=[
        'pymongo',
        'python-dateutil'
    ],
    extras_require={
        'dev': ['check-manifest'],
        'test': ['coverage'],
    },
)