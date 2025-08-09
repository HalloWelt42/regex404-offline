// src/js/regex-engine.js

export class RegexEngine {
    constructor() {
        this.lastRegex = null;
        this.lastFlags = null;
    }

    execute(pattern, flags, testString, flavor = 'javascript') {
        try {
            // Validate and create regex
            const regex = this.createRegex(pattern, flags, flavor);

            // Find all matches
            const matches = this.findMatches(regex, testString, flags.includes('g'));

            return {
                matches: matches,
                pattern: pattern,
                flags: flags,
                testString: testString,
                flavor: flavor
            };
        } catch (error) {
            throw new Error(`Regex Error: ${error.message}`);
        }
    }

    createRegex(pattern, flags, flavor) {
        // Basic flavor-specific adjustments
        let adjustedPattern = pattern;
        let adjustedFlags = flags;

        switch(flavor) {
            case 'pcre':
                // PCRE-style to JavaScript adjustments
                adjustedPattern = this.convertPCREToJS(pattern);
                break;
            case 'python':
                // Python-style to JavaScript adjustments
                adjustedPattern = this.convertPythonToJS(pattern);
                break;
            case 'golang':
                // Go-style to JavaScript adjustments
                adjustedPattern = this.convertGoToJS(pattern);
                break;
        }

        // Create and validate regex
        try {
            return new RegExp(adjustedPattern, adjustedFlags);
        } catch (error) {
            throw new Error(`Invalid regular expression: ${error.message}`);
        }
    }

    findMatches(regex, testString, isGlobal) {
        const matches = [];

        if (isGlobal) {
            // Global matching
            let match;
            const globalRegex = new RegExp(regex.source, regex.flags);

            while ((match = globalRegex.exec(testString)) !== null) {
                // Prevent infinite loops with zero-width matches
                if (match.index === globalRegex.lastIndex) {
                    globalRegex.lastIndex++;
                }

                // Add groups information
                if (match.length > 1) {
                    match.groups = {};
                    for (let i = 1; i < match.length; i++) {
                        match.groups[i] = match[i];
                    }
                }

                matches.push(match);
            }
        } else {
            // Single match
            const match = regex.exec(testString);
            if (match) {
                // Add groups information
                if (match.length > 1) {
                    match.groups = {};
                    for (let i = 1; i < match.length; i++) {
                        match.groups[i] = match[i];
                    }
                }
                matches.push(match);
            }
        }

        return matches;
    }

    substitute(pattern, flags, testString, replacement) {
        try {
            const regex = new RegExp(pattern, flags);

            // Process replacement string for special sequences
            const processedReplacement = replacement
                .replace(/\$(\d+)/g, (match, num) => `$${num}`)  // Numbered groups
                .replace(/\$\{(\d+)\}/g, (match, num) => `$${num}`)  // Bracket notation
                .replace(/\$&/g, '$&')  // Full match
                .replace(/\$`/g, '$`')  // Before match
                .replace(/\$'/g, "$'");  // After match

            return testString.replace(regex, processedReplacement);
        } catch (error) {
            return testString;
        }
    }

    explain(pattern, flags) {
        const explanations = [];
        let i = 0;

        while (i < pattern.length) {
            const char = pattern[i];

            switch(char) {
                case '^':
                    explanations.push(this.createExplanation('^', 'Asserts position at start of string or line'));
                    i++;
                    break;

                case '$':
                    explanations.push(this.createExplanation('$', 'Asserts position at end of string or line'));
                    i++;
                    break;

                case '.':
                    explanations.push(this.createExplanation('.', 'Matches any character (except newline unless s flag is set)'));
                    i++;
                    break;

                case '*':
                    explanations.push(this.createExplanation('*', 'Matches previous token 0 or more times (greedy)'));
                    i++;
                    break;

                case '+':
                    explanations.push(this.createExplanation('+', 'Matches previous token 1 or more times (greedy)'));
                    i++;
                    break;

                case '?':
                    if (i > 0 && (pattern[i-1] === '*' || pattern[i-1] === '+' || pattern[i-1] === '?')) {
                        explanations.push(this.createExplanation('?', 'Makes previous quantifier lazy (non-greedy)'));
                    } else {
                        explanations.push(this.createExplanation('?', 'Matches previous token 0 or 1 time'));
                    }
                    i++;
                    break;

                case '\\':
                    if (i + 1 < pattern.length) {
                        const nextChar = pattern[i + 1];
                        const escapeSeq = '\\' + nextChar;
                        explanations.push(this.createExplanation(escapeSeq, this.getEscapeExplanation(nextChar)));
                        i += 2;
                    } else {
                        i++;
                    }
                    break;

                case '[':
                    const endBracket = pattern.indexOf(']', i);
                    if (endBracket !== -1) {
                        const charClass = pattern.substring(i, endBracket + 1);
                        explanations.push(this.createExplanation(charClass, this.getCharClassExplanation(charClass)));
                        i = endBracket + 1;
                    } else {
                        i++;
                    }
                    break;

                case '(':
                    let depth = 1;
                    let j = i + 1;
                    while (j < pattern.length && depth > 0) {
                        if (pattern[j] === '(' && pattern[j-1] !== '\\') depth++;
                        if (pattern[j] === ')' && pattern[j-1] !== '\\') depth--;
                        j++;
                    }
                    const group = pattern.substring(i, j);
                    explanations.push(this.createExplanation(group, this.getGroupExplanation(group)));
                    i = j;
                    break;

                case '|':
                    explanations.push(this.createExplanation('|', 'Alternation (OR operator)'));
                    i++;
                    break;

                case '{':
                    const endBrace = pattern.indexOf('}', i);
                    if (endBrace !== -1) {
                        const quantifier = pattern.substring(i, endBrace + 1);
                        explanations.push(this.createExplanation(quantifier, this.getQuantifierExplanation(quantifier)));
                        i = endBrace + 1;
                    } else {
                        i++;
                    }
                    break;

                default:
                    explanations.push(this.createExplanation(char, `Matches the character "${char}" literally`));
                    i++;
            }
        }

        // Add flags explanation
        if (flags) {
            explanations.push(this.createExplanation(`Flags: ${flags}`, this.getFlagsExplanation(flags)));
        }

        return this.formatExplanation(explanations);
    }

    createExplanation(token, description) {
        return { token, description };
    }

    getEscapeExplanation(char) {
        const escapes = {
            'd': 'Matches any digit character [0-9]',
            'D': 'Matches any non-digit character',
            'w': 'Matches any word character [a-zA-Z0-9_]',
            'W': 'Matches any non-word character',
            's': 'Matches any whitespace character',
            'S': 'Matches any non-whitespace character',
            'b': 'Matches a word boundary',
            'B': 'Matches a non-word boundary',
            'n': 'Matches a newline character',
            'r': 'Matches a carriage return',
            't': 'Matches a tab character',
            'v': 'Matches a vertical tab character',
            'f': 'Matches a form feed character',
            '0': 'Matches a null character',
            '\\': 'Matches a backslash literally'
        };

        return escapes[char] || `Escapes the character "${char}"`;
    }

    getCharClassExplanation(charClass) {
        if (charClass.startsWith('[^')) {
            return `Matches any character NOT in the set ${charClass.substring(2, charClass.length - 1)}`;
        } else {
            return `Matches any character in the set ${charClass.substring(1, charClass.length - 1)}`;
        }
    }

    getGroupExplanation(group) {
        if (group.startsWith('(?:')) {
            return 'Non-capturing group';
        } else if (group.startsWith('(?=')) {
            return 'Positive lookahead assertion';
        } else if (group.startsWith('(?!')) {
            return 'Negative lookahead assertion';
        } else if (group.startsWith('(?<=')) {
            return 'Positive lookbehind assertion';
        } else if (group.startsWith('(?<!')) {
            return 'Negative lookbehind assertion';
        } else if (group.startsWith('(?<')) {
            const nameEnd = group.indexOf('>');
            const name = group.substring(3, nameEnd);
            return `Named capturing group "${name}"`;
        } else {
            return 'Capturing group';
        }
    }

    getQuantifierExplanation(quantifier) {
        const content = quantifier.substring(1, quantifier.length - 1);

        if (content.includes(',')) {
            const [min, max] = content.split(',');
            if (max) {
                return `Matches previous token between ${min} and ${max} times`;
            } else {
                return `Matches previous token ${min} or more times`;
            }
        } else {
            return `Matches previous token exactly ${content} times`;
        }
    }

    getFlagsExplanation(flags) {
        const flagExplanations = [];

        if (flags.includes('g')) flagExplanations.push('global (find all matches)');
        if (flags.includes('i')) flagExplanations.push('case insensitive');
        if (flags.includes('m')) flagExplanations.push('multiline (^ and $ match line breaks)');
        if (flags.includes('s')) flagExplanations.push('single line (. matches newlines)');
        if (flags.includes('u')) flagExplanations.push('unicode');
        if (flags.includes('y')) flagExplanations.push('sticky');

        return flagExplanations.join(', ');
    }

    formatExplanation(explanations) {
        let html = '<div class="regex-explanation">';

        explanations.forEach(exp => {
            html += `
                <div class="explanation-part">
                    <code>${this.escapeHtml(exp.token)}</code>
                    <span>${exp.description}</span>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    // Flavor converters (basic implementations)
    convertPCREToJS(pattern) {
        // Basic PCRE to JavaScript conversions
        return pattern
            .replace(/\\A/g, '^')
            .replace(/\\Z/g, '$')
            .replace(/\\z/g, '$');
    }

    convertPythonToJS(pattern) {
        // Basic Python to JavaScript conversions
        return pattern;
    }

    convertGoToJS(pattern) {
        // Basic Go to JavaScript conversions
        return pattern;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

