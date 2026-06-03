#!/usr/bin/env python3

import argparse


def main():
    parser = argparse.ArgumentParser(description="Generate a simple skill review page")
    parser.add_argument("workspace")
    parser.add_argument("--skill-name", default="Skill")
    args = parser.parse_args()
    print(f"Generating review for {args.skill_name} in {args.workspace}")


if __name__ == "__main__":
    main()
