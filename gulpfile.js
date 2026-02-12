const { src, dest } = require('gulp');

function buildIcons() {
	return src('nodes/**/*.svg').pipe(dest('dist/nodes'));
}

function buildCredentialIcons() {
	return src('credentials/**/*.svg').pipe(dest('dist/credentials'));
}

exports['build:icons'] = buildIcons;
exports['build:credential-icons'] = buildCredentialIcons;
