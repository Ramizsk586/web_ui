import express from 'express';
import { discoverSkills, loadSkillFiles, searchSkills, type SkillMetadata } from './skillManager.js';

export async function setupSkillRoutes(app: express.Express) {
  // List all available skills
  app.get("/api/skills", (_req, res) => {
    try {
      const skills = discoverSkills();
      res.json({ skills });
    } catch (err) {
      console.error('[skills] discover failed:', err);
      res.status(500).json({ error: 'Failed to discover skills' });
    }
  });

  // Search skills by query
  app.get("/api/skills/search", (req, res) => {
    try {
      const query = req.query.q as string || '';
      const skills = searchSkills(query);
      res.json({ skills });
    } catch (err) {
      console.error('[skills] search failed:', err);
      res.status(500).json({ error: 'Failed to search skills' });
    }
  });

  // Get a specific skill's files
  app.get("/api/skills/:name", (req, res) => {
    try {
      const { name } = req.params;
      const files = loadSkillFiles(name);
      if (files.length === 0) {
        res.status(404).json({ error: 'Skill not found' });
        return;
      }
      res.json({ name, files });
    } catch (err) {
      console.error('[skills] load failed:', err);
      res.status(500).json({ error: 'Failed to load skill' });
    }
  });

  // Get skill metadata only (lightweight)
  app.get("/api/skills/:name/meta", (req, res) => {
    try {
      const { name } = req.params;
      const skills = discoverSkills();
      const skill = skills.find(s => s.name === name);
      if (!skill) {
        res.status(404).json({ error: 'Skill not found' });
        return;
      }
      res.json({ 
        name: skill.name, 
        description: skill.description,
        files: skill.files 
      });
    } catch (err) {
      console.error('[skills] meta failed:', err);
      res.status(500).json({ error: 'Failed to get skill metadata' });
    }
  });
}