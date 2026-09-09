<?php

namespace App\Services;

final class DevanagariTransliterationService
{
    private const STANDALONE_VOWELS = [
        'aa' => 'आ', 'a' => 'अ', 'ai' => 'ऐ', 'au' => 'औ',
        'ee' => 'ई', 'e' => 'ए', 'ii' => 'ई', 'i' => 'इ',
        'oo' => 'ऊ', 'o' => 'ओ', 'uu' => 'ऊ', 'u' => 'उ',
    ];

    private const MATRAS = [
        'aa' => 'ा', 'a' => '', 'ai' => 'ै', 'au' => 'ौ',
        'ee' => 'ी', 'e' => 'े', 'ii' => 'ी', 'i' => 'ि',
        'oo' => 'ू', 'o' => 'ो', 'uu' => 'ू', 'u' => 'ु',
    ];

    /** Control chars stand for multi-letter graphs (checked longest-first). */
    private const DIGRAPH_REPLACEMENTS = [
        'chh' => "\x01", 'ksh' => "\x02", 'sh' => "\x03", 'kh' => "\x04",
        'ch' => "\x05", 'gh' => "\x06", 'th' => "\x07", 'dh' => "\x08",
        'bh' => "\x09", 'ph' => "\x0A", 'jh' => "\x0B", 'ks' => "\x0C",
        'tt' => "\x0D", 'dd' => "\x0E",
    ];

    private const CONSONANT_MAP = [
        "\x01" => 'छ', "\x02" => 'क्ष', "\x03" => 'श', "\x04" => 'ख',
        "\x05" => 'च', "\x06" => 'घ', "\x07" => 'थ', "\x08" => 'ध',
        "\x09" => 'भ', "\x0A" => 'फ', "\x0B" => 'झ', "\x0C" => 'क्ष',
        "\x0D" => 'ट', "\x0E" => 'ड',
        'k' => 'क', 'g' => 'ग', 'c' => 'च', 'j' => 'ज', 't' => 'ट',
        'd' => 'ड', 'p' => 'प', 'b' => 'ब', 'y' => 'य', 'r' => 'र',
        'l' => 'ल', 'v' => 'व', 'w' => 'व', 's' => 'स', 'h' => 'ह',
        'f' => 'फ', 'z' => 'ज', 'q' => 'क', 'x' => 'क्ष', 'n' => 'न',
        'm' => 'म',
    ];

    private const OVERRIDES = [
        'patil' => 'पाटील', 'shinde' => 'शिंदे', 'pawar' => 'पवार',
        'gaikwad' => 'गायकवाड', 'jadhav' => 'जाधव', 'more' => 'मोरे',
        'kulkarni' => 'कुलकर्णी', 'joshi' => 'जोशी', 'deshmukh' => 'देशमुख',
        'chavan' => 'चव्हाण', 'wagh' => 'वाघ', 'thorat' => 'थोरात',
        'khedkar' => 'खेडकर', 'gawande' => 'गवांदे', 'sonawane' => 'सोनावणे',
        'wankhede' => 'वानखेडे', 'bhagat' => 'भगत', 'kadam' => 'कदम',
        'yadav' => 'यादव', 'raut' => 'राऊत', 'nipane' => 'निपाणे',
        'suryawanshi' => 'सूर्यवंशी', 'desale' => 'देसले', 'bhosale' => 'भोसले',
        'shelke' => 'शेलके', 'meshram' => 'मेश्राम', 'ingle' => 'इंगळे',
        'upase' => 'उपासे', 'mule' => 'मुळे', 'zodge' => 'झोडगे',
        'salunkhe' => 'साळुंखे', 'dhande' => 'ढांडे', 'taralekar' => 'तारळेकर',
        'prakash' => 'प्रकाश', 'rahul' => 'राहुल', 'chetan' => 'चेतन',
        'anil' => 'अनिल', 'sanjay' => 'संजय', 'vijay' => 'विजय',
        'suresh' => 'सुरेश', 'mahesh' => 'महेश', 'ramesh' => 'रमेश',
        'mukesh' => 'मुकेश', 'vaishnavi' => 'वैष्णवी', 'sneha' => 'स्नेहा',
        'pooja' => 'पूजा', 'priya' => 'प्रिया', 'amit' => 'अमित',
        'akash' => 'आकाश', 'rohit' => 'रोहित', 'swapnil' => 'स्वप्निल',
        'pratik' => 'प्रतीक', 'sujit' => 'सुजित', 'mayuri' => 'मयुरी',
        'pallavi' => 'पल्लवी', 'shruti' => 'श्रुति', 'prajakta' => 'प्रजाक्ता',
        'ashok' => 'अशोक', 'ashwini' => 'अश्विनी', 'deepak' => 'दीपक',
        'dipak' => 'दिपक', 'rajesh' => 'राजेश', 'mangesh' => 'मंगेश',
        'gajanan' => 'गजानन', 'santosh' => 'संतोष', 'vishal' => 'विशाल',
        'nilesh' => 'निलेश', 'milind' => 'मिलिंद', 'sameer' => 'समीर',
        'amol' => 'अमोल', 'sachin' => 'सचिन', 'ganesh' => 'गणेश',
        'vivek' => 'विवेक', 'nikhil' => 'निखिल', 'pranav' => 'प्रणव',
        'shubham' => 'शुभम', 'siddhesh' => 'सिद्धेश', 'tejas' => 'तेजस',
        'yogesh' => 'योगेश', 'kishor' => 'किशोर', 'manoj' => 'मनोज',
        'ram' => 'राम', 'shyam' => 'श्याम', 'krishna' => 'कृष्णा',
        'lakshmi' => 'लक्ष्मी', 'nita' => 'निता', 'sunita' => 'सुनिता',
        'sarita' => 'सरिता', 'kavita' => 'कविता', 'jyoti' => 'ज्योति',
        'usha' => 'उषा', 'neha' => 'नेहा', 'swati' => 'स्वाती',
        'anjali' => 'अंजली', 'komal' => 'कोमल', 'sarang' => 'सारंग',
        'prashant' => 'प्रशांत', 'pandit' => 'पंडित', 'sarthak' => 'सार्थक',
        'mumbai' => 'मुंबई', 'pune' => 'पुणे', 'nagpur' => 'नागपूर',
        'nashik' => 'नाशिक', 'wardha' => 'वर्धा', 'amaravati' => 'अमरावती',
    ];

    public function transliterate(string $text, string $script = 'mr'): string
    {
        $segments = preg_split('/(\s+)/u', trim($text), -1, PREG_SPLIT_DELIM_CAPTURE);
        $os = [];

        foreach ($segments as $segment) {
            if (trim($segment) === '') {
                $os[] = $segment;
                continue;
            }
            $os[] = $this->transliterateWord($segment);
        }

        return trim(implode('', $os));
    }

    private function transliterateWord(string $word): string
    {
        $lower = mb_strtolower(trim($word), 'UTF-8');
        $clean = preg_replace('/[^a-z0-9]/', '', $lower) ?? '';

        if ($clean === '') {
            return $word;
        }

        if (array_key_exists($clean, self::OVERRIDES)) {
            return self::OVERRIDES[$clean];
        }

        $seq = $lower;
        foreach (self::DIGRAPH_REPLACEMENTS as $find => $ctrl) {
            if (strpos($lower, $find) !== false) {
                $seq = str_replace($find, $ctrl, $seq);
            }
        }

        $out = '';
        $pending = false;
        $n = strlen($seq);

        for ($i = 0; $i < $n; $i++) {
            $c = $seq[$i];
            $next = $i + 1 < $n ? $seq[$i + 1] : '';

            if (strpos('aeiou', $c) !== false) {
                $key = $c;

                if (($c === 'a' && $next === 'a') || ($c === 'a' && $next === 'i') || ($c === 'a' && $next === 'u')) {
                    $key = $c.$next;
                } elseif (($c === 'e' && $next === 'e') || ($c === 'i' && $next === 'i')) {
                    $key = $c.$next;
                } elseif (($c === 'o' && $next === 'o') || ($c === 'u' && $next === 'u')) {
                    $key = $c.$next;
                }

                if ($pending) {
                    if ($key !== 'a') {
                        $out .= self::MATRAS[$key];
                    }
                    $pending = false;
                } else {
                    $out .= self::STANDALONE_VOWELS[$key];
                }

                if (strlen($key) === 2) {
                    $i++;
                }
                continue;
            }

            $mapped = self::CONSONANT_MAP[$c] ?? null;
            if ($mapped === null) {
                if (is_numeric($c)) {
                    $out .= mb_chr(0x0966 + (int) $c, 'UTF-8');
                }
                $pending = false;
                continue;
            }

            if ($pending) {
                $out .= '्';
            }

            if (($c === 'n' || $c === 'm') && $next !== '' && array_key_exists($next, self::CONSONANT_MAP)) {
                $out .= 'ं';
                $pending = false;
                continue;
            }

            $out .= $mapped;
            $pending = true;
        }

        return $out;
    }
}