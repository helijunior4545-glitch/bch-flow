from django import template

register = template.Library()


@register.simple_tag
def technology_icons():
    """Thirty sculptures share one local transparent WebP atlas."""
    technologies = [
        ('python', 'Python'), ('react', 'React'), ('typescript', 'TypeScript'),
        ('docker', 'Docker'), ('git', 'Git'), ('postgresql', 'PostgreSQL'),
        ('linux', 'Linux'), ('rust', 'Rust'), ('go', 'Go'),
        ('javascript', 'JavaScript'), ('vue', 'Vue'), ('angular', 'Angular'),
        ('svelte', 'Svelte'), ('django', 'Django'), ('laravel', 'Laravel'),
        ('php', 'PHP'), ('kotlin', 'Kotlin'), ('swift', 'Swift'),
        ('flutter', 'Flutter'), ('nodejs', 'Node.js'), ('redis', 'Redis'),
        ('mongodb', 'MongoDB'), ('mysql', 'MySQL'), ('kubernetes', 'Kubernetes'),
        ('figma', 'Figma'), ('blender', 'Blender'), ('github', 'GitHub'),
        ('ubuntu', 'Ubuntu'), ('android', 'Android'), ('cplusplus', 'C++'),
    ]
    return [
        {'slug': slug, 'name': name, 'column': index % 6, 'row': index // 6}
        for index, (slug, name) in enumerate(technologies)
    ]
