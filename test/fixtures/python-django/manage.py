#!/usr/bin/env python
"""Django's command-line utility for administrative tasks (fixture)."""
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")
    # TODO: configure production settings module
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
